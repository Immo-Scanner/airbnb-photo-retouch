import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { TIERS, type Tier } from "@/lib/tiers";
import { createOrderIfMissing } from "@/lib/orders";
import { tagBuyer } from "@/lib/active-campaign";

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

  const result = await createOrderIfMissing({
    sessionId: session.id,
    paymentIntent: typeof session.payment_intent === "string" ? session.payment_intent : null,
    tier,
    email,
    customerName: session.customer_details?.name ?? null,
    sendCustomerEmail: true,
  });

  // Tag the buyer in ActiveCampaign on first order creation only — Stripe
  // can replay this webhook, but createOrderIfMissing dedupes on session_id
  // so we only fire AC the first time. (Even if it fired twice, the AC tag
  // endpoint is idempotent — this is just hygiene.)
  if (result.created) {
    await tagBuyer({ email, fullName: session.customer_details?.name ?? null });
  }

  return NextResponse.json({ received: true });
}
