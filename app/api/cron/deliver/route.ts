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
    .select("id, user_id")
    .eq("status", "READY")
    .lte("scheduled_delivery_at", nowIso)
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const delivered: string[] = [];

  for (const order of due ?? []) {
    const { error: updErr } = await admin
      .from("orders")
      .update({ status: "DELIVERED", delivered_at: new Date().toISOString() })
      .eq("id", order.id as string)
      .eq("status", "READY");
    if (updErr) {
      console.error("[cron-deliver] flip failed", order.id, updErr);
      continue;
    }

    const { data: userRes } = await admin.auth.admin.getUserById(order.user_id as string);
    const email = userRes?.user?.email;
    if (email) {
      await sendEmail({
        to: email,
        subject: "Vos photos retouchées sont prêtes — Geoffrey",
        html: deliveryEmailHtml(order.id as string, appUrl),
      });
    }
    delivered.push(order.id as string);
  }

  return NextResponse.json({ delivered });
}
