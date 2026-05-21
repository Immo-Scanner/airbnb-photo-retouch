import { NextResponse } from "next/server";
import { z } from "zod";
import { adminSupabase } from "@/lib/supabase/admin";
import { authorizedOrderId } from "@/lib/order-token";
import { scheduleDelivery } from "@/lib/business-hours";

export const runtime = "nodejs";

const Body = z.object({
  orderId: z.string().uuid(),
  files: z
    .array(
      z.object({
        path: z.string().min(1),
        filename: z.string().min(1),
        sizeBytes: z.number().int().positive(),
      })
    )
    .min(1)
    .max(50),
});

/**
 * The customer just finished uploading a batch of photos. We:
 *   1. Verify cookie ownership + remaining credits on the order.
 *   2. Create a fresh `batches` row to represent this upload session.
 *   3. Insert photo rows linked to that batch (status UPLOADED).
 *   4. Schedule the batch's delivery time (now + DELIVERY_DELAY_HOURS).
 *   5. Bump the order to PROCESSING if it was still AWAITING_UPLOAD.
 *
 * Credits are valid for life — a customer can come back next week / next
 * month and upload another batch as long as they still have credits left.
 */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { orderId, files } = parsed.data;

  const ok = await authorizedOrderId({ expectedOrderId: orderId, queryToken: null });
  if (!ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const admin = adminSupabase();
  const orderRes = (await admin
    .from("orders")
    .select("id, photos_quota, status")
    .eq("id", orderId)
    .single()) as { data: { id: string; photos_quota: number; status: string } | null };
  const order = orderRes.data;
  if (!order) return NextResponse.json({ error: "not found" }, { status: 404 });

  // Remaining credits = quota − every photo already submitted (across all
  // batches, including failed ones — a failed photo still cost a credit).
  const usedRes = await admin
    .from("photos")
    .select("id", { count: "exact", head: true })
    .eq("order_id", orderId);
  const used = usedRes.count ?? 0;
  const remaining = order.photos_quota - used;
  if (files.length > remaining) {
    return NextResponse.json(
      { error: "quota exceeded", remaining },
      { status: 400 }
    );
  }

  // Schedule the delivery for this batch only.
  const now = new Date();
  // DELIVERY_DELAY_BUSINESS_DAYS: number of business days between the last
  // photo upload and the customer's "ready" email (default 2 in prod, 0 in
  // dev/test environments to skip the human-photographer simulation).
  const businessDays = Number(process.env.DELIVERY_DELAY_BUSINESS_DAYS ?? "2");
  const scheduledAt = scheduleDelivery(now, Number.isFinite(businessDays) ? businessDays : 2);

  const batchRes = (await admin
    .from("batches")
    .insert({
      order_id: orderId,
      status: "PROCESSING",
      upload_completed_at: now.toISOString(),
      scheduled_delivery_at: scheduledAt.toISOString(),
    })
    .select("id")
    .single()) as { data: { id: string } | null; error: { message: string } | null };
  if (batchRes.error || !batchRes.data) {
    return NextResponse.json(
      { error: batchRes.error?.message ?? "batch insert failed" },
      { status: 500 }
    );
  }
  const batchId = batchRes.data.id;

  const photoRows = files.map((f) => ({
    order_id: orderId,
    batch_id: batchId,
    original_path: f.path,
    original_filename: f.filename,
    original_size_bytes: f.sizeBytes,
    status: "UPLOADED" as const,
  }));
  const insertedRes = (await admin.from("photos").insert(photoRows).select("id")) as {
    data: { id: string }[] | null;
    error: { message: string } | null;
  };
  if (insertedRes.error || !insertedRes.data) {
    // Roll back the empty batch we just created.
    await admin.from("batches").delete().eq("id", batchId);
    return NextResponse.json(
      { error: insertedRes.error?.message ?? "photo insert failed" },
      { status: 500 }
    );
  }

  // Bump the order from AWAITING_UPLOAD → PROCESSING on the very first batch.
  // Subsequent batches don't change the order status.
  if (order.status === "AWAITING_UPLOAD") {
    await admin
      .from("orders")
      .update({ status: "PROCESSING", upload_completed_at: now.toISOString() })
      .eq("id", orderId);
  }

  return NextResponse.json({
    ok: true,
    batch_id: batchId,
    scheduled_delivery_at: scheduledAt.toISOString(),
    remaining_credits: remaining - files.length,
  });
}
