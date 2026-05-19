import { adminSupabase } from "@/lib/supabase/admin";
import { TIERS, type Tier } from "@/lib/tiers";
import { signOrderToken } from "@/lib/order-token";
import { sendEmail } from "@/lib/email";

/**
 * Idempotently insert an order row for a Stripe checkout session.
 *
 * Both the Stripe webhook (server-to-server) and the success-URL handler
 * (client-driven) call this. The unique index on stripe_session_id keeps the
 * row count to one. On first creation, optionally email the customer their
 * private order link.
 */
export async function createOrderIfMissing(opts: {
  sessionId: string;
  paymentIntent: string | null;
  tier: Tier;
  email: string;
  customerName: string | null;
  sendCustomerEmail: boolean;
}): Promise<{ orderId: string; created: boolean }> {
  const admin = adminSupabase();

  const existing = await admin
    .from("orders")
    .select("id")
    .eq("stripe_session_id", opts.sessionId)
    .maybeSingle();
  if (existing.data) return { orderId: (existing.data as { id: string }).id, created: false };

  const inserted = await admin
    .from("orders")
    .insert({
      stripe_session_id: opts.sessionId,
      stripe_payment_intent: opts.paymentIntent,
      tier: opts.tier,
      photos_quota: TIERS[opts.tier].quota,
      amount_cents: TIERS[opts.tier].amount,
      status: "AWAITING_UPLOAD",
      email: opts.email,
      customer_name: opts.customerName,
    })
    .select("id")
    .single();
  if (inserted.error || !inserted.data) {
    throw new Error(`order insert failed: ${inserted.error?.message}`);
  }
  const orderId = (inserted.data as { id: string }).id;

  if (opts.sendCustomerEmail) {
    const token = await signOrderToken(orderId);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    const link = `${appUrl}/order/${orderId}?t=${encodeURIComponent(token)}`;
    await sendEmail({
      to: opts.email,
      subject: "Votre commande Geoffrey — uploadez vos photos",
      html: orderEmailHtml(link),
    });
  }

  return { orderId, created: true };
}

function orderEmailHtml(link: string): string {
  return `
    <div style="font-family: ui-sans-serif, system-ui; max-width: 560px; margin: 0 auto;">
      <h2>Merci pour votre commande 📸</h2>
      <p>Pour démarrer, uploadez vos photos depuis votre espace personnel :</p>
      <p><a href="${link}" style="background:#f97316;color:white;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block;">Uploader mes photos</a></p>
      <p>Geoffrey commencera la retouche dès réception. Délai habituel : 48h ouvrées.</p>
      <p>— Geoffrey</p>
    </div>
  `;
}
