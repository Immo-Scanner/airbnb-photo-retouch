/**
 * Resend wrapper. No-op if RESEND_API_KEY is not set (dev mode).
 */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    console.log("[email] RESEND_API_KEY not set — skipping send", opts.to, opts.subject);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "Geoffrey <onboarding@resend.dev>",
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    }),
  });
  if (!res.ok) {
    console.error("[email] resend failed", res.status, await res.text());
  }
}

export function deliveryEmailHtml(link: string): string {
  return `
    <div style="font-family: ui-sans-serif, system-ui; max-width: 560px; margin: 0 auto;">
      <h2>Vos photos retouchées sont prêtes 📸</h2>
      <p>Hello,</p>
      <p>J'ai terminé la retouche de vos photos. Vous pouvez les télécharger
      dès maintenant depuis votre espace :</p>
      <p>
        <a href="${link}"
           style="background: #f97316; color: white; padding: 12px 20px; border-radius: 8px; text-decoration: none; display: inline-block;">
          Télécharger mes photos
        </a>
      </p>
      <p>N'hésitez pas à me dire ce que vous en pensez.</p>
      <p>— Geoffrey</p>
    </div>
  `;
}
