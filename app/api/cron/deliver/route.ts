import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { sendEmail, deliveryEmailHtml } from "@/lib/email";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Cron — called by Vercel every 15 minutes.
 *
 * Picks up orders where:
 *   - status = 'READY' (all photos done by AutoEnhance)
 *   - scheduled_delivery_at <= now() (the fake-human delay has elapsed)
 * → flips them to DELIVERED and sends the "Geoffrey done" email.
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = adminSupabase();
  const nowIso = new Date().toISOString();

  const { data: due, error } = await admin
    .from("orders")
    .select("id, email")
    .eq("status", "READY")
    .lte("scheduled_delivery_at", nowIso)
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const delivered: string[] = [];

  for (const order of due ?? []) {
    const orderId = order.id as string;
    const email = order.email as string | null;

    const { error: updErr } = await admin
      .from("orders")
      .update({ status: "DELIVERED", delivered_at: new Date().toISOString() })
      .eq("id", orderId)
      .eq("status", "READY");
    if (updErr) {
      console.error("[cron-deliver] flip failed", orderId, updErr);
      continue;
    }

    if (email) {
      const { signOrderToken } = await import("@/lib/order-token");
      const tok = await signOrderToken(orderId);
      const link = `${appUrl}/order/${orderId}?t=${encodeURIComponent(tok)}`;
      await sendEmail({
        to: email,
        subject: "Vos photos retouchées sont prêtes — Geoffrey",
        html: deliveryEmailHtml(link),
      });
    }
    delivered.push(orderId);
  }

  return NextResponse.json({ delivered });
}
