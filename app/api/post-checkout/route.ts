import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { setOrderCookie } from "@/lib/order-token";
import { tierFromString } from "@/lib/tiers";
import { createOrderIfMissing } from "@/lib/orders";

export const runtime = "nodejs";

/**
 * Stripe success_url handler — the user lands here right after paying.
 *
 * Race: the webhook may not have fired yet when this route runs. We don't
 * wait for it: we re-fetch the Checkout Session from Stripe (authoritative),
 * call the same idempotent createOrderIfMissing helper, then set the signed
 * order cookie and redirect to /order/[id]/upload.
 *
 * The webhook still runs in parallel — both paths converge on the same row
 * via the unique index on stripe_session_id.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("session_id");
  if (!sessionId) return NextResponse.json({ error: "missing session_id" }, { status: 400 });

  const session = await stripe().checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== "paid") {
    return NextResponse.redirect(new URL("/?canceled=1", url));
  }

  const tier = tierFromString(session.metadata?.tier ?? "");
  const email = session.customer_details?.email ?? session.customer_email ?? null;
  if (!tier || !email) {
    return NextResponse.json({ error: "stripe session is missing tier or email" }, { status: 400 });
  }

  const { orderId } = await createOrderIfMissing({
    sessionId: session.id,
    paymentIntent: typeof session.payment_intent === "string" ? session.payment_intent : null,
    tier,
    email,
    // The webhook is the canonical sender. We avoid a duplicate email here.
    sendCustomerEmail: false,
  });

  await setOrderCookie(orderId);
  return NextResponse.redirect(new URL(`/order/${orderId}/upload`, url));
}
