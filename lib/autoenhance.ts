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

export async function registerImage(imageName: string): Promise<RegisterImageResponse> {
  // We deliberately do NOT send our internal order_id — AutoEnhance manages
  // its own "orders" and rejects external IDs (was the root cause of an
  // intermittent "undefined upload_url" returned from the API).
  const res = await fetch(`${BASE}/images/`, {
    method: "POST",
    headers: { ...headers(), "Content-Type": "application/json" },
    body: JSON.stringify({ image_name: imageName }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`AutoEnhance register failed: ${res.status} ${text}`);
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`AutoEnhance register: non-JSON response: ${text.slice(0, 200)}`);
  }
  const payload = parsed as Partial<RegisterImageResponse>;
  if (!payload.image_id || !payload.upload_url) {
    throw new Error(
      `AutoEnhance register: missing image_id/upload_url in response: ${text.slice(0, 200)}`
    );
  }
  return payload as RegisterImageResponse;
}

export async function uploadImageBinary(uploadUrl: string, body: ArrayBuffer | Buffer | Uint8Array) {
  if (!uploadUrl) throw new Error("AutoEnhance uploadImageBinary: uploadUrl is empty");
  // Normalize to Uint8Array — node:fetch in some runtimes mis-handles raw
  // ArrayBuffer in the body and surfaces a confusing "toString of undefined".
  const normalized: BodyInit =
    body instanceof Uint8Array ? body : body instanceof ArrayBuffer ? new Uint8Array(body) : body;
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "application/octet-stream" },
    body: normalized,
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
