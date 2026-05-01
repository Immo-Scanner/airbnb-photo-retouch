import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { adminSupabase } from "@/lib/supabase/admin";
import { TIERS, type Tier } from "@/lib/tiers";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) return NextResponse.json({ error: "missing signature" }, { status: 400 });

  const body = await req.text();
  let event;
  try {
    event = stripe().webhooks.constructEvent(body, sig, secret);
  } catch (e) {
    return NextResponse.json({ error: `webhook verify failed: ${(e as Error).message}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = session.metadata?.user_id;
    const tier = session.metadata?.tier as Tier | undefined;
    if (!userId || !tier || !TIERS[tier]) {
      return NextResponse.json({ error: "missing metadata" }, { status: 400 });
    }

    const admin = adminSupabase();
    const { error } = await admin.from("orders").insert({
      user_id: userId,
      stripe_session_id: session.id,
      stripe_payment_intent: typeof session.payment_intent === "string" ? session.payment_intent : null,
      tier,
      photos_quota: TIERS[tier].quota,
      amount_cents: TIERS[tier].amount,
      status: "AWAITING_UPLOAD",
    });
    if (error && error.code !== "23505") {
      console.error("[stripe-webhook] insert error", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
