import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { registerImage, uploadImageBinary } from "@/lib/autoenhance";
import { scheduleDelivery } from "@/lib/business-hours";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  orderId: z.string().uuid(),
  files: z
    .array(z.object({ path: z.string().min(1), filename: z.string().min(1), sizeBytes: z.number().int().positive() }))
    .min(1)
    .max(50),
});

export async function POST(req: Request) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { orderId, files } = parsed.data;

  const admin = adminSupabase();

  // Verify order ownership and state
  const { data: order } = await admin
    .from("orders")
    .select("id, user_id, photos_quota, status")
    .eq("id", orderId)
    .single();
  if (!order || order.user_id !== user.id) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (order.status !== "AWAITING_UPLOAD")
    return NextResponse.json({ error: "order already processed" }, { status: 409 });
  if (files.length > (order.photos_quota as number))
    return NextResponse.json({ error: "quota exceeded" }, { status: 400 });

  // Insert photo rows
  const photoRows = files.map((f) => ({
    order_id: orderId,
    original_path: f.path,
    original_filename: f.filename,
    original_size_bytes: f.sizeBytes,
    status: "UPLOADED" as const,
  }));
  const { data: insertedPhotos, error: insertErr } = await admin
    .from("photos")
    .insert(photoRows)
    .select("id, original_path");
  if (insertErr || !insertedPhotos)
    return NextResponse.json({ error: insertErr?.message ?? "insert failed" }, { status: 500 });

  // Push each to AutoEnhance: register → download from Supabase → PUT to upload_url
  for (const photo of insertedPhotos) {
    try {
      const { data: signed } = await admin.storage
        .from("originals")
        .createSignedUrl(photo.original_path as string, 60);
      if (!signed?.signedUrl) throw new Error("could not sign original URL");

      const fileRes = await fetch(signed.signedUrl);
      if (!fileRes.ok) throw new Error(`download original failed: ${fileRes.status}`);
      const bin = await fileRes.arrayBuffer();

      const reg = await registerImage(`order_${orderId}_photo_${photo.id}`, orderId);
      await uploadImageBinary(reg.upload_url, bin);

      await admin
        .from("photos")
        .update({
          autoenhance_image_id: reg.image_id,
          autoenhance_order_id: reg.order_id,
          status: "PROCESSING",
        })
        .eq("id", photo.id as string);
    } catch (e) {
      console.error("[upload-complete] photo failed", photo.id, e);
      await admin
        .from("photos")
        .update({ status: "FAILED", error_message: (e as Error).message })
        .eq("id", photo.id as string);
    }
  }

  // Schedule the human-like delivery time NOW (so the cron can pick it up later).
  // Keep the order in PROCESSING until the AutoEnhance webhook flips the last photo to ENHANCED;
  // the cron then verifies status === READY && now >= scheduled_delivery_at before delivering.
  const now = new Date();
  const scheduledAt = scheduleDelivery(now, 48);

  await admin
    .from("orders")
    .update({
      status: "PROCESSING",
      upload_completed_at: now.toISOString(),
      scheduled_delivery_at: scheduledAt.toISOString(),
    })
    .eq("id", orderId);

  return NextResponse.json({ ok: true, scheduled_delivery_at: scheduledAt.toISOString() });
}
