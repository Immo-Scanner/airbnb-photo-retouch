import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { TIERS, tierFromString } from "@/lib/tiers";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const tier = tierFromString(url.searchParams.get("tier") ?? "");
  if (!tier) return NextResponse.json({ error: "invalid tier" }, { status: 400 });

  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL(`/login?tier=${tier}`, url));

  const priceId = process.env[TIERS[tier].priceEnv];
  if (!priceId) return NextResponse.json({ error: `${TIERS[tier].priceEnv} not set` }, { status: 500 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? url.origin;
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: user.email,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/dashboard?paid=1`,
    cancel_url: `${appUrl}/?canceled=1`,
    metadata: { user_id: user.id, tier },
  });

  return NextResponse.redirect(session.url!, { status: 303 });
}
