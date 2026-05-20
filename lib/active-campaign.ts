/**
 * ActiveCampaign v3 wrapper — upserts a contact by email and applies the
 * buyer tag (default id 130, override via env). Fire-and-forget by design:
 * any AC failure is logged but never blocks the Stripe webhook from
 * completing, otherwise Stripe would retry and we'd accidentally try to
 * create duplicate orders.
 */

const AC_URL = process.env.ACTIVE_CAMPAIGN_URL; // e.g. https://yourname.api-us1.com
const AC_TOKEN = process.env.ACTIVE_CAMPAIGN_API_KEY;
const BUYER_TAG_ID = Number(process.env.ACTIVE_CAMPAIGN_BUYER_TAG_ID ?? "130");

export async function tagBuyer(opts: {
  email: string;
  fullName?: string | null;
}): Promise<void> {
  if (!AC_URL || !AC_TOKEN) {
    console.log("[active-campaign] not configured — skipping tag for", opts.email);
    return;
  }

  const { firstName, lastName } = splitName(opts.fullName ?? "");

  try {
    // Step 1 — upsert the contact (idempotent on email).
    const contactRes = await fetch(`${AC_URL}/api/3/contact/sync`, {
      method: "POST",
      headers: {
        "Api-Token": AC_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contact: {
          email: opts.email,
          ...(firstName ? { firstName } : {}),
          ...(lastName ? { lastName } : {}),
        },
      }),
    });
    if (!contactRes.ok) {
      const body = await contactRes.text();
      console.error("[active-campaign] contact sync failed", contactRes.status, body.slice(0, 300));
      return;
    }
    const { contact } = (await contactRes.json()) as { contact?: { id?: string } };
    const contactId = contact?.id;
    if (!contactId) {
      console.error("[active-campaign] contact sync: no contact.id in response");
      return;
    }

    // Step 2 — apply the buyer tag. AC ignores duplicates if the tag is
    // already on the contact, so this is safe to call on every webhook hit.
    const tagRes = await fetch(`${AC_URL}/api/3/contactTags`, {
      method: "POST",
      headers: {
        "Api-Token": AC_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contactTag: {
          contact: contactId,
          tag: BUYER_TAG_ID,
        },
      }),
    });
    if (!tagRes.ok) {
      const body = await tagRes.text();
      console.error(
        "[active-campaign] tag add failed",
        tagRes.status,
        `tag=${BUYER_TAG_ID}`,
        body.slice(0, 300)
      );
      return;
    }
    console.log(
      `[active-campaign] ✓ tagged contact ${contactId} (${maskEmail(opts.email)}) with #${BUYER_TAG_ID}`
    );
  } catch (e) {
    console.error("[active-campaign] unexpected error", e);
  }
}

function splitName(full: string): { firstName?: string; lastName?: string } {
  const trimmed = full.trim();
  if (!trimmed) return {};
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function maskEmail(e: string): string {
  const at = e.indexOf("@");
  if (at < 0) return e.slice(0, 2) + "***";
  return e.slice(0, 2) + "***" + e.slice(at);
}
