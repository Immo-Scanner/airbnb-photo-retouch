import { NextResponse } from "next/server";
import { z } from "zod";
import { adminSupabase } from "@/lib/supabase/admin";
import { authorizedOrderId } from "@/lib/order-token";

export const runtime = "nodejs";

const Body = z.object({
  orderId: z.string().uuid(),
  files: z
    .array(z.object({ filename: z.string().min(1), sizeBytes: z.number().int().positive() }))
    .min(1)
    .max(50),
});

/**
 * Hand out signed upload URLs for the batch the customer is about to send.
 *
 * Allowed any time as long as the order has remaining credits — the order
 * status is no longer the gate (a customer can come back days later and
 * upload more photos from the same purchase, that's the whole point of
 * the credit-pool model).
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
    .select("photos_quota")
    .eq("id", orderId)
    .single()) as { data: { photos_quota: number } | null };
  const order = orderRes.data;
  if (!order) return NextResponse.json({ error: "not found" }, { status: 404 });

  const usedRes = await admin
    .from("photos")
    .select("id", { count: "exact", head: true })
    .eq("order_id", orderId);
  const remaining = order.photos_quota - (usedRes.count ?? 0);
  if (files.length > remaining) {
    return NextResponse.json({ error: "quota exceeded", remaining }, { status: 400 });
  }

  const urls: { path: string; signedUrl: string; filename: string }[] = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const safeName = f.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${orderId}/${Date.now()}_${i}_${safeName}`;
    const { data, error } = await admin.storage
      .from("originals")
      .createSignedUploadUrl(path);
    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "could not sign url" }, { status: 500 });
    }
    urls.push({ path, signedUrl: data.signedUrl, filename: f.filename });
  }

  return NextResponse.json({ urls });
}
