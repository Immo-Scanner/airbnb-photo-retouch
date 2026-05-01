import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { adminSupabase } from "@/lib/supabase/admin";
import { TIERS, type Tier } from "@/lib/tiers";
import { signOrderToken } from "@/lib/order-token";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";

/**
 * Stripe webhook handler. Idempotent with /api/post-checkout — both routes
 * try to create the order from the same Stripe session, with the email taken
 * from `customer_details.email`. The unique index on `stripe_session_id`
 * guarantees only one row exists.
 *
 * Side effects on first creation: sends the customer their order link by email.
 */
export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) return NextResponse.json({ error: "missing signature" }, { status: 400 });

  const body = await req.text();
  let event;
  try {
    event = stripe().webhooks.constructEvent(body, sig, secret);
  } catch (e) {
    return NextResponse.json({ error: `verify failed: ${(e as Error).message}` }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") return NextResponse.json({ received: true });

  const session = event.data.object;
  const tier = session.metadata?.tier as Tier | undefined;
  const email = session.customer_details?.email ?? session.customer_email ?? null;
  if (!tier || !TIERS[tier] || !email) {
    return NextResponse.json({ error: "missing metadata or email" }, { status: 400 });
  }

  await createOrderIfMissing({
    sessionId: session.id,
    paymentIntent: typeof session.payment_intent === "string" ? session.payment_intent : null,
    tier,
    email,
    sendCustomerEmail: true,
  });

  return NextResponse.json({ received: true });
}

/**
 * Shared between the webhook and the success-URL handler. Creates the order
 * if no row exists for that Stripe session yet, and (optionally) emails the
 * customer their order link.
 */
export async function createOrderIfMissing(opts: {
  sessionId: string;
  paymentIntent: string | null;
  tier: Tier;
  email: string;
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
