import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { authorizedOrderId } from "@/lib/order-token";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Mark a FAILED photo as UPLOADED so the process cron picks it up again on
 * its next tick. Order must belong to the caller and must not be DELIVERED.
 *
 * We don't run the OpenAI edit inline here — the cron worker is the single
 * place where edits happen, so concurrency stays simple and we never blow
 * the function timeout.
 */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: photoId } = await ctx.params;
  const admin = adminSupabase();

  const photoRes = (await admin
    .from("photos")
    .select("id, order_id, status")
    .eq("id", photoId)
    .single()) as { data: { id: string; order_id: string; status: string } | null };
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

  await admin
    .from("photos")
    .update({ status: "UPLOADED", error_message: null })
    .eq("id", photo.id);

  // Pull the order back from READY → PROCESSING if needed, so the deliver
  // cron waits for the retried photo.
  await admin
    .from("orders")
    .update({ status: "PROCESSING" })
    .eq("id", photo.order_id)
    .eq("status", "READY");

  return NextResponse.json({ ok: true });
}
