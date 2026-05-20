import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { enhanceImage } from "@/lib/openai-image";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Photo processing tick — called by Supabase pg_cron every minute.
 *
 * Picks the oldest UPLOADED photo, runs it through OpenAI image edit, stores
 * the result in the `enhanced` bucket, then flips its status to ENHANCED
 * (or FAILED on error).
 *
 * When the last UPLOADED photo of an order is processed, the parent order
 * is moved from PROCESSING → READY. The existing deliver cron then takes
 * over once `scheduled_delivery_at` has elapsed.
 *
 * We process ONE photo per tick (not a batch) because gpt-image-1 takes
 * 25-50s per image and the Vercel Hobby 60s function timeout would clip
 * any parallel run.
 */
export async function GET(req: Request) {
  const runId = Math.random().toString(36).slice(2, 8);
  const t0 = Date.now();

  const auth = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = adminSupabase();

  type PhotoRow = {
    id: string;
    order_id: string;
    original_path: string;
    original_filename: string;
  };

  // Pick the oldest UPLOADED photo first.
  let next: PhotoRow | undefined = (
    (await admin
      .from("photos")
      .select("id, order_id, original_path, original_filename")
      .eq("status", "UPLOADED")
      .order("created_at", { ascending: true })
      .limit(1)) as { data: PhotoRow[] | null }
  ).data?.[0];

  // If none, look for a "stuck" PROCESSING photo — locked by a previous tick
  // that crashed (Vercel 60s timeout during OpenAI or Supabase upload).
  // 3 minutes is well above the worst-case successful tick (~50s).
  let recovering = false;
  if (!next) {
    const stuckThreshold = new Date(Date.now() - 3 * 60 * 1000).toISOString();
    const stuck = (
      (await admin
        .from("photos")
        .select("id, order_id, original_path, original_filename")
        .eq("status", "PROCESSING")
        .lt("updated_at", stuckThreshold)
        .order("updated_at", { ascending: true })
        .limit(1)) as { data: PhotoRow[] | null }
    ).data?.[0];
    if (stuck) {
      next = stuck;
      recovering = true;
      // Flip stuck → UPLOADED first so the standard atomic-lock below works.
      await admin
        .from("photos")
        .update({ status: "UPLOADED" })
        .eq("id", stuck.id)
        .eq("status", "PROCESSING");
    }
  }

  if (!next) {
    console.log(`[process-photos ${runId}] nothing pending`);
    return NextResponse.json({ run: runId, processed: 0 });
  }

  console.log(
    `[process-photos ${runId}] ${recovering ? "RECOVERING stuck" : "picking"} photo ${next.id} of order ${next.order_id}`
  );

  // Mark PROCESSING up front so a concurrent tick can't grab the same row.
  // Use the conditional update as a row-level lock — if another tick already
  // flipped it, our update touches 0 rows and we bail.
  const lockRes = (await admin
    .from("photos")
    .update({ status: "PROCESSING" })
    .eq("id", next.id)
    .eq("status", "UPLOADED")
    .select("id")) as { data: { id: string }[] | null };
  if (!lockRes.data || lockRes.data.length === 0) {
    console.log(`[process-photos ${runId}] lost race on ${next.id} — yielding`);
    return NextResponse.json({ run: runId, processed: 0, photo_id: next.id, raced: true });
  }

  try {
    const { data: signed } = await admin.storage
      .from("originals")
      .createSignedUrl(next.original_path, 120);
    if (!signed?.signedUrl) throw new Error("could not sign original URL");

    const orig = await fetch(signed.signedUrl);
    if (!orig.ok) throw new Error(`download original failed: ${orig.status}`);
    const bin = await orig.arrayBuffer();

    const { b64 } = await enhanceImage(bin, next.original_filename);
    const enhancedBytes = Buffer.from(b64, "base64");

    const enhancedPath = `${next.order_id}/enhanced_${next.id}_${next.original_filename.replace(
      /[^a-zA-Z0-9._-]/g,
      "_"
    )}.jpg`;

    const upload = await admin.storage
      .from("enhanced")
      .upload(enhancedPath, new Uint8Array(enhancedBytes), {
        contentType: "image/jpeg",
        upsert: true,
      });
    if (upload.error) throw upload.error;

    await admin
      .from("photos")
      .update({ status: "ENHANCED", enhanced_path: enhancedPath, error_message: null })
      .eq("id", next.id);

    await maybeFlipOrderReady(admin, next.order_id);

    const ms = Date.now() - t0;
    console.log(`[process-photos ${runId}] ✓ photo ${next.id} done in ${ms}ms`);
    return NextResponse.json({ run: runId, processed: 1, photo_id: next.id, elapsed_ms: ms });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[process-photos ${runId}] ✗ photo ${next.id} failed: ${msg}`);
    await admin
      .from("photos")
      .update({ status: "FAILED", error_message: msg })
      .eq("id", next.id);
    // Even a FAILED photo counts as "done" for the order-level done check —
    // we don't want to wedge the order on a permanently failing image.
    await maybeFlipOrderReady(admin, next.order_id);
    return NextResponse.json({ run: runId, processed: 0, photo_id: next.id, error: msg }, { status: 200 });
  }
}

async function maybeFlipOrderReady(admin: ReturnType<typeof adminSupabase>, orderId: string) {
  const photosRes = (await admin.from("photos").select("status").eq("order_id", orderId)) as {
    data: { status: string }[] | null;
  };
  const photos = photosRes.data ?? [];
  const allDone = photos.length > 0 && photos.every((p) => p.status === "ENHANCED" || p.status === "FAILED");
  if (!allDone) return;
  await admin
    .from("orders")
    .update({ status: "READY" })
    .eq("id", orderId)
    .eq("status", "PROCESSING");
}
