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

  // Visitor id from the ImmoScan sales page: links the purchase to the visit
  // (conversion rate + Meta CAPI on the ImmoScan side).
  const visitorId = (url.searchParams.get("vid") ?? "").replace(/[^A-Za-z0-9.-]/g, "").slice(0, 100);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? url.origin;
  const cancelUrl = process.env.SALES_PAGE_URL || `${appUrl}/?canceled=1`;
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl,
    metadata: { tier, ...(visitorId ? { visitor_id: visitorId } : {}) },

    customer_creation: "always",

    // Show the "Add promotion code" link on the Stripe page. Codes themselves
    // are managed in the Stripe dashboard (Products → Coupons / Promotion codes).
    allow_promotion_codes: true,

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
