import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { tierFromString } from "@/lib/tiers";
import { createOrderIfMissing } from "@/lib/orders";
import { signOrderToken, ORDER_COOKIE_NAME } from "@/lib/order-token";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Fired by the /checkout/success client page right after Stripe redirects
 * the user back. Idempotent with the Stripe webhook (both call
 * createOrderIfMissing). Sets the order_session cookie via response headers
 * — only Route Handlers / Server Actions / Middleware are allowed to mutate
 * cookies in Next 15.
 */
export async function POST(req: Request) {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("session_id");
  if (!sessionId) return NextResponse.json({ error: "missing session_id" }, { status: 400 });

  const session = await stripe().checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== "paid") {
    return NextResponse.json({ error: "payment not completed" }, { status: 409 });
  }

  const tier = tierFromString(session.metadata?.tier ?? "");
  const email = session.customer_details?.email ?? session.customer_email ?? null;
  if (!tier || !email) {
    return NextResponse.json({ error: "stripe session missing tier or email" }, { status: 400 });
  }

  const { orderId } = await createOrderIfMissing({
    sessionId: session.id,
    paymentIntent: typeof session.payment_intent === "string" ? session.payment_intent : null,
    tier,
    email,
    sendCustomerEmail: false,
  });

  const token = await signOrderToken(orderId);
  const res = NextResponse.json({ orderId });
  res.cookies.set(ORDER_COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  return res;
}
