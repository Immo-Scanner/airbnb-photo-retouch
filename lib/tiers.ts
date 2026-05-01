export type Tier = "S" | "M" | "L";

export const TIERS = {
  S: { quota: 1, amount: 700, label: "1 photo", priceEnv: "STRIPE_PRICE_S" },
  M: { quota: 5, amount: 2700, label: "5 photos (4 + 1 offerte)", priceEnv: "STRIPE_PRICE_M" },
  L: { quota: 20, amount: 9700, label: "20 photos (15 + 5 offertes)", priceEnv: "STRIPE_PRICE_L" },
} as const satisfies Record<Tier, { quota: number; amount: number; label: string; priceEnv: string }>;

export function tierFromString(s: string): Tier | null {
  return s === "S" || s === "M" || s === "L" ? s : null;
}
