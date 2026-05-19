/**
 * OpenAI image edit wrapper.
 *
 * Uses the gpt-image-1 model on POST /v1/images/edits with the
 * STR-photographer prompt. Returns the edited image as a Buffer.
 *
 * Pricing: ~$0.04 per high-quality image as of the API knowledge cutoff
 * (gpt-image-1 standard). For 20 photos = ~$0.80 / order, well under the
 * 97€ tier margin.
 *
 * Timing: a single edit takes ~25–50s. Above the Vercel Hobby 60s function
 * timeout for batches, so the processing endpoint must run images one at a
 * time per cron tick (or upgrade to Pro / fluid compute).
 */

const ENHANCE_PROMPT =
  process.env.OPENAI_IMAGE_PROMPT ??
  "À la manière d'un photographe immobilier professionnel, modifie légèrement cette photo en lui restant fidèle afin de la rendre plus attractive dans le cadre d'une annonce pour de la location courte durée premium";

interface EditResult {
  b64: string;
  mime: string;
}

export async function enhanceImage(input: ArrayBuffer, filename: string): Promise<EditResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const form = new FormData();
  form.append("model", "gpt-image-1");
  form.append("prompt", ENHANCE_PROMPT);
  form.append("n", "1");
  form.append("size", process.env.OPENAI_IMAGE_SIZE ?? "auto");
  form.append("quality", process.env.OPENAI_IMAGE_QUALITY ?? "high");
  form.append("output_format", "jpeg");
  // gpt-image-1 accepts up to 16 images; we only ever send one.
  form.append("image", new Blob([input], { type: guessMime(filename) }), filename);

  const res = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`OpenAI image edit ${res.status}: ${text.slice(0, 500)}`);
  }
  let parsed: { data?: { b64_json?: string }[] };
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`OpenAI image edit non-JSON response: ${text.slice(0, 200)}`);
  }
  const b64 = parsed.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error(`OpenAI image edit: no b64_json in response. body=${text.slice(0, 500)}`);
  }
  return { b64, mime: "image/jpeg" };
}

function guessMime(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".heic") || lower.endsWith(".heif")) return "image/heic";
  return "image/jpeg";
}
