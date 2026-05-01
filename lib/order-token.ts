/**
 * HMAC-SHA256 signed tokens for order access.
 *
 * No Supabase Auth in the client flow: after a Stripe payment, we hand the
 * customer a `{orderId}.{hmac}` token both in the success-URL cookie and in
 * the confirmation email. Any /order/[id]/* request validates that the token
 * matches the URL's order id.
 *
 * Web Crypto only — no extra deps. Symmetric: the same `ORDER_TOKEN_SECRET`
 * env var signs and verifies.
 */
import { cookies } from "next/headers";

const COOKIE_NAME = "order_session";
const enc = new TextEncoder();

async function hmacKey(): Promise<CryptoKey> {
  const secret = process.env.ORDER_TOKEN_SECRET;
  if (!secret) throw new Error("ORDER_TOKEN_SECRET is not set");
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function b64urlEncode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return Buffer.from(bytes).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Uint8Array {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4);
  return new Uint8Array(Buffer.from(padded, "base64"));
}

export async function signOrderToken(orderId: string): Promise<string> {
  const key = await hmacKey();
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(orderId));
  return `${orderId}.${b64urlEncode(sig)}`;
}

export async function verifyOrderToken(token: string): Promise<string | null> {
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const orderId = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  try {
    const key = await hmacKey();
    const ok = await crypto.subtle.verify("HMAC", key, b64urlDecode(sig), enc.encode(orderId));
    return ok ? orderId : null;
  } catch {
    return null;
  }
}

/**
 * Read-and-verify an order id either from the `?t=` query param or from the
 * order_session cookie. Returns null if neither resolves to a valid id matching
 * the requested orderId.
 *
 * The query param wins over the cookie so that a user clicking a fresh email
 * link is always authenticated for the order in that link, even if the cookie
 * was set for a different order earlier.
 */
export async function authorizedOrderId(opts: {
  expectedOrderId: string;
  queryToken?: string | null;
}): Promise<boolean> {
  if (opts.queryToken) {
    const verified = await verifyOrderToken(opts.queryToken);
    if (verified === opts.expectedOrderId) return true;
  }
  const c = await cookies();
  const cookieTok = c.get(COOKIE_NAME)?.value;
  if (cookieTok) {
    const verified = await verifyOrderToken(cookieTok);
    if (verified === opts.expectedOrderId) return true;
  }
  return false;
}

export async function setOrderCookie(orderId: string): Promise<void> {
  const tok = await signOrderToken(orderId);
  const c = await cookies();
  c.set(COOKIE_NAME, tok, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
}

export const ORDER_COOKIE_NAME = COOKIE_NAME;
