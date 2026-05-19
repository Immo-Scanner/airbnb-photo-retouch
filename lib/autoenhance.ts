/**
 * AutoEnhance.ai v3 client.
 *
 * Flow per image:
 *   1. POST /v3/images/  → returns { image_id, upload_url, order_id }
 *   2. PUT  upload_url   ← raw image bytes
 *   3. webhook image_processed (configured in dashboard) hits our /api/autoenhance/webhook
 *   4. GET  /v3/images/{id}/enhanced?preview=false  → returns binary
 */

const BASE = "https://api.autoenhance.ai/v3";

function headers(extra: Record<string, string> = {}) {
  const h: Record<string, string> = {
    "x-api-key": process.env.AUTOENHANCE_API_KEY!,
    ...extra,
  };
  if (process.env.AUTOENHANCE_DEV_MODE === "true") h["x-dev-mode"] = "true";
  return h;
}

export interface RegisterImageResponse {
  image_id: string;
  upload_url: string;
  order_id: string;
}

/**
 * Create an AutoEnhance "order" — a grouping bucket for images. We use one
 * per customer order so all 5/20 photos of a single Stripe checkout show up
 * bundled in the Autoenhance dashboard with the customer name + email as the
 * title.
 */
export async function createOrder(name: string): Promise<{ order_id: string }> {
  const res = await fetch(`${BASE}/orders/`, {
    method: "POST",
    headers: { ...headers(), "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`AutoEnhance create order failed: ${res.status} ${text}`);
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(`AutoEnhance create order: non-JSON response: ${text.slice(0, 200)}`);
  }
  const orderId = (parsed.order_id ?? parsed.id) as string | undefined;
  if (!orderId) {
    const keys = Object.keys(parsed).join(", ");
    throw new Error(`AutoEnhance create order: no order_id. keys=[${keys}] body=${text.slice(0, 500)}`);
  }
  return { order_id: orderId };
}

/**
 * Tuned defaults for short-term-rental / Airbnb photos. These are NOT the
 * generic "property" preset — they push the AI toward the warmer, more
 * inviting feel that converts on STR platforms.
 *
 * Why each one:
 *   ai_version 5.x             → latest model, includes window-pull-with-skies
 *   enhance_type "warm"        → inviting tones (vs "neutral" / "modern")
 *   cloud_type "LOW_CLOUD"     → vibrant blue + puffy clouds (sells the dream)
 *   sky_replacement true       → kills overcast / grey skies
 *   window_pull_type WINDOWS_WITH_SKIES → bright windows showing the view
 *   vertical_correction true   → straightens walls (huge perceived quality boost)
 *   lens_correction true       → corrects wide-angle distortion
 *   privacy true               → blurs faces / license plates if any
 *
 * Restage (in-painting: fireplaces, grass, photographer removal, TV black-out)
 * is OPT-IN via AUTOENHANCE_RESTAGE=true because it likely consumes premium
 * credits — turn it on once we've confirmed the billing impact.
 */
function strEnhanceBody(): Record<string, unknown> {
  const base: Record<string, unknown> = {
    enhance: true,
    ai_version: process.env.AUTOENHANCE_AI_VERSION ?? "5.x",
    enhance_type: process.env.AUTOENHANCE_ENHANCE_TYPE ?? "warm",
    cloud_type: process.env.AUTOENHANCE_CLOUD_TYPE ?? "LOW_CLOUD",
    sky_replacement: true,
    window_pull_type: process.env.AUTOENHANCE_WINDOW_PULL ?? "WINDOWS_WITH_SKIES",
    vertical_correction: true,
    lens_correction: true,
    privacy: true,
    upscale: false,
  };
  if (process.env.AUTOENHANCE_RESTAGE === "true") {
    base.restage = {
      fire_in_fireplaces: "ALIGHT",
      grass: "GREEN",
      photographer: "REMOVE",
      tvs: "BLACK_OUT",
    };
  }
  return base;
}

export async function registerImage(
  imageName: string,
  autoenhanceOrderId?: string
): Promise<RegisterImageResponse> {
  const res = await fetch(`${BASE}/images/`, {
    method: "POST",
    headers: { ...headers(), "Content-Type": "application/json" },
    body: JSON.stringify({
      image_name: imageName,
      ...(autoenhanceOrderId ? { order_id: autoenhanceOrderId } : {}),
      ...strEnhanceBody(),
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`AutoEnhance register failed: ${res.status} ${text}`);
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`AutoEnhance register: non-JSON response: ${text.slice(0, 200)}`);
  }
  const payload = parsed as Record<string, unknown>;
  // The v3 response is large (full image metadata) and the field names vary
  // slightly across docs vs production. Pick the actual identifier and upload
  // URL by trying a few known aliases.
  const imageId = (payload.image_id ?? payload.id) as string | undefined;
  // The production API returns the field as `s3PutObjectUrl` (camelCase, S3
  // pre-signed PUT URL). The docs name `upload_url` doesn't appear in the
  // actual payload — keep it as a defensive fallback in case they unify.
  const uploadUrl = (payload.s3PutObjectUrl ?? payload.upload_url ?? payload.s3_upload_url ?? payload.url) as
    | string
    | undefined;
  const orderId = (payload.order_id ?? "") as string;
  if (!imageId || !uploadUrl) {
    const keys = Object.keys(payload).join(", ");
    throw new Error(
      `AutoEnhance register: no image_id/upload_url in response. keys=[${keys}] body=${text.slice(0, 800)}`
    );
  }
  return { image_id: imageId, upload_url: uploadUrl, order_id: orderId };
}

export async function uploadImageBinary(uploadUrl: string, body: ArrayBuffer | Buffer | Uint8Array) {
  if (!uploadUrl) throw new Error("AutoEnhance uploadImageBinary: uploadUrl is empty");
  // Normalize to Uint8Array — node:fetch in some runtimes mis-handles raw
  // ArrayBuffer in the body and surfaces a confusing "toString of undefined".
  const normalized =
    body instanceof Uint8Array ? body : body instanceof ArrayBuffer ? new Uint8Array(body) : body;
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "application/octet-stream" },
    body: normalized as BodyInit,
  });
  if (!res.ok) throw new Error(`AutoEnhance upload failed: ${res.status} ${await res.text()}`);
}

export async function downloadEnhanced(imageId: string): Promise<ArrayBuffer> {
  const res = await fetch(`${BASE}/images/${imageId}/enhanced?preview=false`, {
    headers: headers(),
  });
  if (!res.ok) throw new Error(`AutoEnhance download failed: ${res.status} ${await res.text()}`);
  return await res.arrayBuffer();
}

export async function getImageStatus(imageId: string): Promise<{ enhanced: boolean; error?: string }> {
  const res = await fetch(`${BASE}/images/${imageId}`, { headers: headers() });
  if (!res.ok) throw new Error(`AutoEnhance status failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as { enhanced: boolean; error?: string };
}
