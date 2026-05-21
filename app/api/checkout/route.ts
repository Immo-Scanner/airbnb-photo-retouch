import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { TIERS, tierFromString } from "@/lib/tiers";

/**
 * Public checkout — no auth required. Stripe collects the email itself at
 * the payment step. We DON'T pre-lookup an existing Customer here because
 * we don't know the email at click-time; the Stripe webhook handles the
 * link between repeat buyers and their existing Customer record after the
 * fact.
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

    customer_creation: "always",

    // Business-friendly: optional VAT/SIRET + billing address. Both appear on
    // the auto-generated invoice if filled.
    tax_id_collection: { enabled: true },
    billing_address_collection: "auto",

    // Stripe Tax computes the right VAT for the buyer's location and writes
    // it on the invoice. Requires Stripe Tax enabled + tax registrations
    // configured in the Stripe dashboard.
    automatic_tax: { enabled: true },

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
  });

  return NextResponse.redirect(session.url!, { status: 303 });
}
