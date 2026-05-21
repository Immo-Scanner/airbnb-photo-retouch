import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { TIERS, tierFromString } from "@/lib/tiers";

/**
 * Public checkout — no auth required. Stripe collects the email at checkout
 * time. The Stripe webhook + /api/post-checkout pair create the order and
 * issue a signed order token that authenticates further requests.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const tier = tierFromString(url.searchParams.get("tier") ?? "");
  if (!tier) return NextResponse.json({ error: "invalid tier" }, { status: 400 });

  const priceId = process.env[TIERS[tier].priceEnv];
  if (!priceId) return NextResponse.json({ error: `${TIERS[tier].priceEnv} not set` }, { status: 500 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? url.origin;
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/?canceled=1`,
    metadata: { tier },
    // Always create a Stripe Customer for every paid order so we can find
    // them in the dashboard, attach future invoices, and audit history.
    customer_creation: "always",
    // Auto-create a Stripe Invoice for the payment. The customer gets the
    // PDF in their Stripe email; we keep the invoice id on the order for
    // accounting.
    invoice_creation: {
      enabled: true,
      invoice_data: {
        description: `Retouche photo Geoffrey — Formule ${tier} (${TIERS[tier].quota} photo${
          TIERS[tier].quota > 1 ? "s" : ""
        })`,
        metadata: { tier },
        footer: "Immoscan · contact@immoscan.fr",
      },
    },
    // Stripe will collect the email if customer_email is unset (default UX).
  });

  return NextResponse.redirect(session.url!, { status: 303 });
}
