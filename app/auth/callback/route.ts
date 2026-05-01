import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const tier = url.searchParams.get("tier");

  if (code) {
    const supabase = await createServerSupabase();
    await supabase.auth.exchangeCodeForSession(code);
  }

  if (tier === "S" || tier === "M" || tier === "L") {
    return NextResponse.redirect(new URL(`/api/checkout?tier=${tier}`, url));
  }
  return NextResponse.redirect(new URL("/dashboard", url));
}
