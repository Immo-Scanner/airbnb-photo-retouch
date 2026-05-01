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

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { orderId, files } = parsed.data;

  const ok = await authorizedOrderId({ expectedOrderId: orderId, queryToken: null });
  if (!ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const admin = adminSupabase();
  const orderRes = (await admin
    .from("orders")
    .select("photos_quota, status")
    .eq("id", orderId)
    .single()) as { data: { photos_quota: number; status: string } | null };
  const order = orderRes.data;
  if (!order) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (order.status !== "AWAITING_UPLOAD") return NextResponse.json({ error: "already processed" }, { status: 409 });
  if (files.length > order.photos_quota) return NextResponse.json({ error: "quota exceeded" }, { status: 400 });

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
