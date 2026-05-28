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
    batch_id: string | null;
    original_path: string;
    original_filename: string;
    custom_prompt: string | null;
  };

  // Recover any photo stuck in PROCESSING > 3 min (Vercel killed the previous
  // tick before status could flip). Flip them back to UPLOADED so the lock
  // below treats them like any other queued row. We sweep up to 5 per tick
  // so a backlog can't be permanently shadowed by a steady stream of fresh
  // UPLOADED photos.
  const stuckThreshold = new Date(Date.now() - 3 * 60 * 1000).toISOString();
  const stuckRes = (await admin
    .from("photos")
    .update({ status: "UPLOADED" })
    .eq("status", "PROCESSING")
    .lt("updated_at", stuckThreshold)
    .select("id")) as { data: { id: string }[] | null };
  const recovered = stuckRes.data?.length ?? 0;
  if (recovered > 0) {
    console.log(`[process-photos ${runId}] recovered ${recovered} stuck photo(s)`);
  }

  // Now pick the oldest UPLOADED — covers both fresh uploads and just-recovered
  // ones, with stuck recoveries jumping ahead because their created_at is older.
  const next: PhotoRow | undefined = (
    (await admin
      .from("photos")
      .select("id, order_id, batch_id, original_path, original_filename, custom_prompt")
      .eq("status", "UPLOADED")
      .order("created_at", { ascending: true })
      .limit(1)) as { data: PhotoRow[] | null }
  ).data?.[0];

  if (!next) {
    console.log(`[process-photos ${runId}] nothing pending`);
    return NextResponse.json({ run: runId, processed: 0, recovered });
  }

  console.log(`[process-photos ${runId}] picking photo ${next.id} of order ${next.order_id}`);

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

    const { b64 } = await enhanceImage(bin, next.original_filename, next.custom_prompt);
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

    if (next.batch_id) await maybeFlipBatchReady(admin, next.batch_id);

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
    // Even a FAILED photo counts as "done" for the batch-level check — we
    // don't want to wedge the batch on a permanently failing image.
    if (next.batch_id) await maybeFlipBatchReady(admin, next.batch_id);
    return NextResponse.json({ run: runId, processed: 0, photo_id: next.id, error: msg }, { status: 200 });
  }
}

async function maybeFlipBatchReady(admin: ReturnType<typeof adminSupabase>, batchId: string) {
  const photosRes = (await admin.from("photos").select("status").eq("batch_id", batchId)) as {
    data: { status: string }[] | null;
  };
  const photos = photosRes.data ?? [];
  const allDone =
    photos.length > 0 && photos.every((p) => p.status === "ENHANCED" || p.status === "FAILED");
  if (!allDone) return;
  await admin
    .from("batches")
    .update({ status: "READY" })
    .eq("id", batchId)
    .eq("status", "PROCESSING");
}
