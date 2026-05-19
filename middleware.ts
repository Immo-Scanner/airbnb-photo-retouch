import { NextRequest, NextResponse } from "next/server";
import { verifyOrderToken, ORDER_COOKIE_NAME } from "@/lib/order-token";

/**
 * When the user lands on /order/{id}?t={token} (from an email link), verify
 * the token and convert it into a long-lived cookie, then redirect to the
 * clean URL. This is the only place we're allowed to mutate cookies on these
 * pages — server components can read cookies but cannot set them in Next 15.
 */
export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const match = url.pathname.match(/^\/order\/([0-9a-f-]{36})(?:\/.*)?$/);
  if (!match) return NextResponse.next();

  const orderId = match[1];
  const token = url.searchParams.get("t");
  if (!token) return NextResponse.next();

  const verified = await verifyOrderToken(token);
  if (verified !== orderId) return NextResponse.next();

  const cleanUrl = url.clone();
  cleanUrl.searchParams.delete("t");
  const res = NextResponse.redirect(cleanUrl);
  res.cookies.set(ORDER_COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  return res;
}

export const config = {
  matcher: ["/order/:path*"],
};
