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
 * Called by the upload client once every file has hit Supabase Storage.
 *
 * We just record the photo rows as UPLOADED and move the order to PROCESSING;
 * the heavy lifting (OpenAI image edits) is then drained one photo at a time
 * by the /api/photos/process cron tick. This keeps this handler fast even
 * for a 20-photo order — otherwise we'd blow past Vercel's 60s function
 * timeout the moment we tried to do the edits inline.
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
  if (order.status !== "AWAITING_UPLOAD")
    return NextResponse.json({ error: "order already processed" }, { status: 409 });
  if (files.length > order.photos_quota)
    return NextResponse.json({ error: "quota exceeded" }, { status: 400 });

  const photoRows = files.map((f) => ({
    order_id: orderId,
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
    return NextResponse.json(
      { error: insertedRes.error?.message ?? "insert failed" },
      { status: 500 }
    );
  }

  const now = new Date();
  const delayHours = Number(process.env.DELIVERY_DELAY_HOURS ?? "48");
  const scheduledAt = scheduleDelivery(now, Number.isFinite(delayHours) ? delayHours : 48);

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
