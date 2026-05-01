import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function stripe() {
  if (_stripe) return _stripe;
  _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-02-24.acacia" });
  return _stripe;
}
