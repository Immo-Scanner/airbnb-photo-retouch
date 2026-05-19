import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { sendEmail, deliveryEmailHtml } from "@/lib/email";
import { signOrderToken } from "@/lib/order-token";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Cron — called every 15 minutes by Supabase pg_cron + pg_net.
 *
 * Picks up orders where:
 *   - status = 'READY' (all photos done by AutoEnhance)
 *   - scheduled_delivery_at <= now() (the fake-human delay has elapsed)
 * → flips them to DELIVERED and sends the "Geoffrey done" email.
 *
 * Every run logs a header + per-order trace so we can audit deliveries from
 * the Vercel log stream when something goes silently wrong.
 */
export async function GET(req: Request) {
  const runId = Math.random().toString(36).slice(2, 8);
  const t0 = Date.now();

  const auth = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    console.warn(`[cron-deliver ${runId}] 401 unauthorized — auth-len=${auth.length}`);
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = adminSupabase();
  const nowIso = new Date().toISOString();

  console.log(`[cron-deliver ${runId}] tick at ${nowIso}`);

  // Snapshot of READY orders (for visibility into the upcoming pipeline).
  const readySnap = await admin
    .from("orders")
    .select("id, scheduled_delivery_at")
    .eq("status", "READY");
  const readyAll = (readySnap.data ?? []) as { id: string; scheduled_delivery_at: string | null }[];
  const readyDue = readyAll.filter(
    (o) => o.scheduled_delivery_at && o.scheduled_delivery_at <= nowIso
  );
  console.log(
    `[cron-deliver ${runId}] READY orders: ${readyAll.length} total, ${readyDue.length} due`
  );

  const { data: due, error } = await admin
    .from("orders")
    .select("id, email")
    .eq("status", "READY")
    .lte("scheduled_delivery_at", nowIso)
    .limit(50);
  if (error) {
    console.error(`[cron-deliver ${runId}] query failed`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const delivered: string[] = [];
  const skipped: { id: string; reason: string }[] = [];

  for (const order of due ?? []) {
    const orderId = order.id as string;
    const email = order.email as string | null;

    const { data: updRow, error: updErr } = await admin
      .from("orders")
      .update({ status: "DELIVERED", delivered_at: new Date().toISOString() })
      .eq("id", orderId)
      .eq("status", "READY")
      .select("id")
      .maybeSingle();
    if (updErr) {
      console.error(`[cron-deliver ${runId}] flip failed`, orderId, updErr);
      skipped.push({ id: orderId, reason: `flip:${updErr.message}` });
      continue;
    }
    if (!updRow) {
      console.warn(`[cron-deliver ${runId}] race — order ${orderId} not in READY anymore`);
      skipped.push({ id: orderId, reason: "race-already-flipped" });
      continue;
    }

    if (!email) {
      console.warn(`[cron-deliver ${runId}] delivered without email`, orderId);
      delivered.push(orderId);
      continue;
    }

    try {
      const tok = await signOrderToken(orderId);
      const link = `${appUrl}/order/${orderId}?t=${encodeURIComponent(tok)}`;
      await sendEmail({
        to: email,
        subject: "Vos photos retouchées sont prêtes — Geoffrey",
        html: deliveryEmailHtml(link),
      });
      console.log(`[cron-deliver ${runId}] ✓ delivered ${orderId} to ${maskEmail(email)}`);
    } catch (e) {
      console.error(`[cron-deliver ${runId}] email send failed for ${orderId}`, e);
      // We don't roll back the DELIVERED flip — the customer can still find
      // their order via the original link they got on confirmation.
    }
    delivered.push(orderId);
  }

  const ms = Date.now() - t0;
  console.log(
    `[cron-deliver ${runId}] done in ${ms}ms — delivered=${delivered.length} skipped=${skipped.length}`
  );

  return NextResponse.json({
    run: runId,
    delivered,
    skipped,
    ready_total: readyAll.length,
    ready_due: readyDue.length,
    elapsed_ms: ms,
  });
}

function maskEmail(e: string): string {
  const at = e.indexOf("@");
  if (at < 0) return e.slice(0, 2) + "***";
  return e.slice(0, 2) + "***" + e.slice(at);
}
