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

export async function registerImage(imageName: string, orderId?: string): Promise<RegisterImageResponse> {
  const res = await fetch(`${BASE}/images/`, {
    method: "POST",
    headers: { ...headers(), "Content-Type": "application/json" },
    body: JSON.stringify({ image_name: imageName, ...(orderId ? { order_id: orderId } : {}) }),
  });
  if (!res.ok) throw new Error(`AutoEnhance register failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as RegisterImageResponse;
}

export async function uploadImageBinary(uploadUrl: string, body: ArrayBuffer | Buffer | Uint8Array) {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "application/octet-stream" },
    body: body as BodyInit,
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
