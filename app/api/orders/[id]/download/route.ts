import { NextResponse } from "next/server";
import JSZip from "jszip";
import { adminSupabase } from "@/lib/supabase/admin";
import { authorizedOrderId } from "@/lib/order-token";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: orderId } = await ctx.params;
  const ok = await authorizedOrderId({ expectedOrderId: orderId, queryToken: null });
  if (!ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const admin = adminSupabase();
  const orderRes = (await admin
    .from("orders")
    .select("id, status")
    .eq("id", orderId)
    .single()) as { data: { id: string; status: string } | null };
  const order = orderRes.data;
  if (!order) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (order.status !== "DELIVERED") return NextResponse.json({ error: "not delivered yet" }, { status: 409 });

  const photosRes = (await admin
    .from("photos")
    .select("original_filename, enhanced_path")
    .eq("order_id", orderId)
    .eq("status", "ENHANCED")) as {
    data: { original_filename: string; enhanced_path: string | null }[] | null;
  };
  const photos = photosRes.data ?? [];
  if (!photos.length) return NextResponse.json({ error: "no enhanced photos" }, { status: 404 });

  const zip = new JSZip();
  for (const p of photos) {
    if (!p.enhanced_path) continue;
    const { data: blob, error } = await admin.storage.from("enhanced").download(p.enhanced_path);
    if (error || !blob) continue;
    const buf = Buffer.from(await blob.arrayBuffer());
    const name = `retouchee_${p.original_filename.replace(/\.[^.]+$/, "")}.jpg`;
    zip.file(name, buf);
  }

  const out = await zip.generateAsync({ type: "nodebuffer" });
  return new NextResponse(new Uint8Array(out), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="photos_geoffrey_${orderId.slice(0, 8)}.zip"`,
    },
  });
}
