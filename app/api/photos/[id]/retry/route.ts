import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { authorizedOrderId } from "@/lib/order-token";
import { registerImage, uploadImageBinary } from "@/lib/autoenhance";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Re-push a FAILED photo to AutoEnhance. The order must belong to the caller
 * (cookie-authenticated) and must not be DELIVERED yet — once delivered, the
 * customer has already received the "all done" email and we don't want to
 * silently move the goalposts.
 */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: photoId } = await ctx.params;
  const admin = adminSupabase();

  const photoRes = (await admin
    .from("photos")
    .select("id, order_id, original_path, status")
    .eq("id", photoId)
    .single()) as {
    data: { id: string; order_id: string; original_path: string; status: string } | null;
  };
  const photo = photoRes.data;
  if (!photo) return NextResponse.json({ error: "not found" }, { status: 404 });

  const ok = await authorizedOrderId({ expectedOrderId: photo.order_id, queryToken: null });
  if (!ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  if (photo.status !== "FAILED") {
    return NextResponse.json({ error: `photo is not retryable (status=${photo.status})` }, { status: 409 });
  }

  const orderRes = (await admin
    .from("orders")
    .select("status")
    .eq("id", photo.order_id)
    .single()) as { data: { status: string } | null };
  if (orderRes.data?.status === "DELIVERED") {
    return NextResponse.json({ error: "order already delivered" }, { status: 409 });
  }

  try {
    const { data: signed } = await admin.storage
      .from("originals")
      .createSignedUrl(photo.original_path, 60);
    if (!signed?.signedUrl) throw new Error("could not sign original URL");

    const fileRes = await fetch(signed.signedUrl);
    if (!fileRes.ok) throw new Error(`download original failed: ${fileRes.status}`);
    const bin = await fileRes.arrayBuffer();

    const reg = await registerImage(`order_${photo.order_id}_photo_${photo.id}_retry`);
    await uploadImageBinary(reg.upload_url, bin);

    await admin
      .from("photos")
      .update({
        autoenhance_image_id: reg.image_id,
        autoenhance_order_id: reg.order_id,
        status: "PROCESSING",
        error_message: null,
      })
      .eq("id", photo.id);

    // If the order was already READY (all other photos done), bring it back to
    // PROCESSING — the retried photo needs the AutoEnhance round-trip to finish
    // before we can re-flip to READY.
    await admin
      .from("orders")
      .update({ status: "PROCESSING" })
      .eq("id", photo.order_id)
      .eq("status", "READY");

    return NextResponse.json({ ok: true });
  } catch (e) {
    await admin
      .from("photos")
      .update({ status: "FAILED", error_message: (e as Error).message })
      .eq("id", photo.id);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
