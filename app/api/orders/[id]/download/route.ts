import { NextResponse } from "next/server";
import JSZip from "jszip";
import { createServerSupabase } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: orderId } = await ctx.params;
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const admin = adminSupabase();

  const { data: order } = await admin
    .from("orders")
    .select("id, user_id, status")
    .eq("id", orderId)
    .single();
  if (!order || order.user_id !== user.id) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (order.status !== "DELIVERED") return NextResponse.json({ error: "not delivered yet" }, { status: 409 });

  const { data: photos } = await admin
    .from("photos")
    .select("original_filename, enhanced_path")
    .eq("order_id", orderId)
    .eq("status", "ENHANCED");

  if (!photos?.length) return NextResponse.json({ error: "no enhanced photos" }, { status: 404 });

  const zip = new JSZip();
  for (const p of photos) {
    if (!p.enhanced_path) continue;
    const { data: blob, error } = await admin.storage.from("enhanced").download(p.enhanced_path as string);
    if (error || !blob) continue;
    const buf = Buffer.from(await blob.arrayBuffer());
    const name = `retouchee_${(p.original_filename as string).replace(/\.[^.]+$/, "")}.jpg`;
    zip.file(name, buf);
  }

  const out = await zip.generateAsync({ type: "uint8array" });
  return new NextResponse(out, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="photos_geoffrey_${orderId.slice(0, 8)}.zip"`,
    },
  });
}
