import type Stripe from "stripe";

/**
 * Transmet chaque achat payé à ImmoScan, qui héberge désormais la page de
 * vente : ImmoScan s'en sert pour le taux de conversion et envoie le Purchase
 * à Meta (CAPI, pixel ImmoScan). `visitor_id` (posé par la page de vente dans
 * la session Stripe) relie l'achat à la visite.
 *
 * Fire-and-forget : une panne côté ImmoScan ne doit jamais faire échouer le
 * webhook Stripe. ImmoScan déduplique sur l'id de session, un rejeu est sans
 * effet.
 */
export async function notifyImmoscanPurchase(session: Stripe.Checkout.Session): Promise<void> {
  const url = process.env.IMMOSCAN_PURCHASE_WEBHOOK_URL;
  const secret = process.env.IMMOSCAN_WEBHOOK_SECRET;
  if (!url || !secret) {
    console.log("[immoscan] not configured — skipping purchase", session.id);
    return;
  }

  const details = session.customer_details;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-geoffrey-secret": secret },
      body: JSON.stringify({
        sessionId: session.id,
        tier: session.metadata?.tier,
        amountCents: session.amount_total ?? 0,
        currency: session.currency ?? "eur",
        email: details?.email ?? session.customer_email,
        paidAt: session.created,
        visitorId: session.metadata?.visitor_id || null,
        name: details?.name ?? null,
        phone: details?.phone ?? null,
        city: details?.address?.city ?? null,
        zip: details?.address?.postal_code ?? null,
        country: details?.address?.country ?? null,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) console.error("[immoscan] purchase webhook failed", session.id, res.status);
  } catch (e) {
    console.error("[immoscan] purchase webhook error", session.id, e);
  }
}
