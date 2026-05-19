import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { downloadEnhanced } from "@/lib/autoenhance";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * AutoEnhance webhook — fired when a single image finishes processing.
 *
 * We protect the endpoint with a shared token configured in the AutoEnhance
 * dashboard (custom Authorization header). Set AUTOENHANCE_WEBHOOK_TOKEN in
 * env and paste the same value into the Autoenhance webhook config.
 */
export async function POST(req: Request) {
  const expected = process.env.AUTOENHANCE_WEBHOOK_TOKEN ?? "";
  if (!expected) return NextResponse.json({ error: "server not configured" }, { status: 500 });

  // AutoEnhance's docs don't pin down where it puts the auth value. Accept any
  // of the common formats: Authorization raw, Authorization Bearer, or a few
  // X-* header variants.
  const candidates = [
    // AutoEnhance actually sends a custom `Authentication:` header (not Authorization).
    req.headers.get("authentication") ?? "",
    req.headers.get("authorization") ?? "",
    (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, ""),
    req.headers.get("x-authorization") ?? "",
    req.headers.get("x-webhook-token") ?? "",
    req.headers.get("x-auth-token") ?? "",
  ];

  if (!candidates.some((v) => v && v === expected)) {
    console.warn(
      "[autoenhance-webhook] 401",
      "headers=",
      Array.from(req.headers.keys()).join(","),
      "auth-len=",
      (req.headers.get("authorization") ?? "").length
    );
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const payload = (await req.json().catch(() => null)) as
    | { event?: string; image_id?: string; order_id?: string; error?: boolean | string }
    | null;
  if (!payload) return NextResponse.json({ error: "bad payload" }, { status: 400 });

  if (payload.event === "webhook_updated") return NextResponse.json({ received: true });

  if (payload.event !== "image_processed" || !payload.image_id) {
    return NextResponse.json({ received: true });
  }

  const admin = adminSupabase();

  if (payload.error) {
    await admin
      .from("photos")
      .update({ status: "FAILED", error_message: typeof payload.error === "string" ? payload.error : "AutoEnhance error" })
      .eq("autoenhance_image_id", payload.image_id);
    return NextResponse.json({ received: true });
  }

  const { data: photo } = await admin
    .from("photos")
    .select("id, order_id, original_filename")
    .eq("autoenhance_image_id", payload.image_id)
    .single();
  if (!photo) {
    console.warn("[autoenhance-webhook] unknown image_id", payload.image_id);
    return NextResponse.json({ received: true });
  }

  try {
    const buf = await downloadEnhanced(payload.image_id);
    const enhancedPath = `${photo.order_id}/enhanced_${photo.id}_${(photo.original_filename as string).replace(
      /[^a-zA-Z0-9._-]/g,
      "_"
    )}`;
    const { error: upErr } = await admin.storage
      .from("enhanced")
      .upload(enhancedPath, new Uint8Array(buf), {
        contentType: "image/jpeg",
        upsert: true,
      });
    if (upErr) throw upErr;

    await admin
      .from("photos")
      .update({ status: "ENHANCED", enhanced_path: enhancedPath })
      .eq("id", photo.id as string);

    // If all photos for the order are now ENHANCED (or FAILED), flip order to READY.
    // The cron job will then deliver it once scheduled_delivery_at <= now.
    const { data: photosOfOrder } = await admin
      .from("photos")
      .select("status")
      .eq("order_id", photo.order_id as string);
    const allDone = photosOfOrder?.every((p) => p.status === "ENHANCED" || p.status === "FAILED");
    if (allDone) {
      await admin.from("orders").update({ status: "READY" }).eq("id", photo.order_id as string);
    }
  } catch (e) {
    console.error("[autoenhance-webhook] download/upload failed", e);
    await admin
      .from("photos")
      .update({ status: "FAILED", error_message: (e as Error).message })
      .eq("id", photo.id as string);
  }

  return NextResponse.json({ received: true });
}
