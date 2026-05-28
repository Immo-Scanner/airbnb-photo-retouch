import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { createServerSupabase } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";

export const runtime = "nodejs";

/**
 * Mint a single-use redo voucher for a given order. Admin-only.
 *
 * Returns the customer-facing URL ready to copy-paste into a reply email.
 * The token row tracks usage so the link cannot be reused — admin needs to
 * generate a fresh one each time they grant a redo.
 */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: orderId } = await ctx.params;

  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const admin = adminSupabase();

  // 32 hex chars = 128 bits of entropy. Cryptographically random, opaque.
  const token = randomBytes(16).toString("hex");

  const { error } = await admin
    .from("redo_tokens")
    .insert({ order_id: orderId, token });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(_req.url).origin;
  return NextResponse.json({
    url: `${appUrl}/order/${orderId}/redo?r=${token}`,
  });
}
