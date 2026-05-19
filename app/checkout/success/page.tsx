import { redirect } from "next/navigation";
import { stripe } from "@/lib/stripe";
import { setOrderCookie } from "@/lib/order-token";
import { tierFromString } from "@/lib/tiers";
import { createOrderIfMissing } from "@/lib/orders";

export const dynamic = "force-dynamic";

/**
 * Stripe success_url landing.
 *
 * The page does the order creation server-side; while it's running, Next.js
 * automatically renders the sibling loading.tsx (a reassuring "Paiement reçu"
 * splash with a spinner). This replaces the previous /api/post-checkout
 * endpoint which redirected without ever rendering UI — leading to a 2-3s
 * blank tab right after the user hit "Pay".
 */
export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;
  if (!session_id) redirect("/?canceled=1");

  const session = await stripe().checkout.sessions.retrieve(session_id);
  if (session.payment_status !== "paid") redirect("/?canceled=1");

  const tier = tierFromString(session.metadata?.tier ?? "");
  const email = session.customer_details?.email ?? session.customer_email ?? null;
  if (!tier || !email) {
    throw new Error("Stripe session is missing tier or email metadata.");
  }

  const { orderId } = await createOrderIfMissing({
    sessionId: session.id,
    paymentIntent: typeof session.payment_intent === "string" ? session.payment_intent : null,
    tier,
    email,
    // The Stripe webhook owns the customer-facing email; we only set the cookie here.
    sendCustomerEmail: false,
  });

  await setOrderCookie(orderId);
  redirect(`/order/${orderId}/upload`);
}
