import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { sendEmail, deliveryEmailHtml } from "@/lib/email";
import { signOrderToken } from "@/lib/order-token";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Cron — picks up BATCHES (not orders) in READY state whose scheduled
 * delivery time has elapsed, flips them to DELIVERED, and emails the
 * customer a link to their order page (where they can grab the batch zip).
 *
 * Since one order can spawn many batches over time, the order itself never
 * flips to DELIVERED — it just stays PROCESSING until the credits run out
 * (and even then the dashboard works normally for download).
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

  // Snapshot of READY batches for visibility.
  const snap = (await admin
    .from("batches")
    .select("id, scheduled_delivery_at")
    .eq("status", "READY")) as { data: { id: string; scheduled_delivery_at: string | null }[] | null };
  const readyAll = snap.data ?? [];
  const readyDue = readyAll.filter(
    (b) => b.scheduled_delivery_at && b.scheduled_delivery_at <= nowIso
  );
  console.log(
    `[cron-deliver ${runId}] READY batches: ${readyAll.length} total, ${readyDue.length} due`
  );

  const dueRes = (await admin
    .from("batches")
    .select("id, order_id")
    .eq("status", "READY")
    .lte("scheduled_delivery_at", nowIso)
    .limit(50)) as { data: { id: string; order_id: string }[] | null; error: { message: string } | null };
  if (dueRes.error) {
    console.error(`[cron-deliver ${runId}] query failed`, dueRes.error);
    return NextResponse.json({ error: dueRes.error.message }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const delivered: string[] = [];
  const skipped: { id: string; reason: string }[] = [];

  for (const batch of dueRes.data ?? []) {
    const batchId = batch.id;
    const orderId = batch.order_id;

    // Conditional flip — only one tick can take ownership.
    const flipRes = (await admin
      .from("batches")
      .update({ status: "DELIVERED", delivered_at: new Date().toISOString() })
      .eq("id", batchId)
      .eq("status", "READY")
      .select("id")
      .maybeSingle()) as { data: { id: string } | null; error: { message: string } | null };
    if (flipRes.error) {
      skipped.push({ id: batchId, reason: `flip:${flipRes.error.message}` });
      continue;
    }
    if (!flipRes.data) {
      skipped.push({ id: batchId, reason: "race-already-flipped" });
      continue;
    }

    // Fetch the email for this batch's order.
    const orderRes = (await admin
      .from("orders")
      .select("email")
      .eq("id", orderId)
      .single()) as { data: { email: string | null } | null };
    const email = orderRes.data?.email;
    if (!email) {
      console.warn(`[cron-deliver ${runId}] batch ${batchId} delivered without email`);
      delivered.push(batchId);
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
      console.log(
        `[cron-deliver ${runId}] ✓ delivered batch ${batchId} to ${maskEmail(email)} (order ${orderId.slice(0, 8)})`
      );
    } catch (e) {
      console.error(`[cron-deliver ${runId}] email send failed for batch ${batchId}`, e);
    }
    delivered.push(batchId);
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
