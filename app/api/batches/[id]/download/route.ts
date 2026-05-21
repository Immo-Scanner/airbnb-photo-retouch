import { NextResponse } from "next/server";
import JSZip from "jszip";
import { adminSupabase } from "@/lib/supabase/admin";
import { authorizedOrderId } from "@/lib/order-token";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Zip the enhanced photos of a single batch. The batch must belong to an
 * order the caller owns (cookie-authenticated) AND must have been delivered
 * — we don't reveal the photos before the customer is supposed to see them.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: batchId } = await ctx.params;
  const admin = adminSupabase();

  const batchRes = (await admin
    .from("batches")
    .select("id, order_id, status")
    .eq("id", batchId)
    .single()) as { data: { id: string; order_id: string; status: string } | null };
  const batch = batchRes.data;
  if (!batch) return NextResponse.json({ error: "not found" }, { status: 404 });

  const ok = await authorizedOrderId({ expectedOrderId: batch.order_id, queryToken: null });
  if (!ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  if (batch.status !== "DELIVERED") {
    return NextResponse.json({ error: "batch not delivered yet" }, { status: 409 });
  }

  const photosRes = (await admin
    .from("photos")
    .select("original_filename, enhanced_path")
    .eq("batch_id", batchId)
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
      "Content-Disposition": `attachment; filename="photos_geoffrey_${batchId.slice(0, 8)}.zip"`,
    },
  });
}
