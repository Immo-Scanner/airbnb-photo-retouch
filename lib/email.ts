/**
 * SendGrid v3 wrapper. No-op if SENDGRID_API_KEY is not set (dev mode logs
 * to console instead of sending).
 *
 * The sender address (EMAIL_FROM) must be verified in SendGrid — either via
 * Single Sender Verification or by authenticating the immoscan.fr domain
 * under Settings → Sender Authentication.
 */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!process.env.SENDGRID_API_KEY) {
    console.log("[email] SENDGRID_API_KEY not set — skipping send", opts.to, opts.subject);
    return;
  }

  const fromAddress = process.env.EMAIL_FROM ?? "contact@immoscan.fr";
  const fromName = process.env.EMAIL_FROM_NAME ?? "Geoffrey · Immoscan";

  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: opts.to }] }],
      from: { email: fromAddress, name: fromName },
      reply_to: { email: fromAddress, name: fromName },
      subject: opts.subject,
      content: [{ type: "text/html", value: opts.html }],
    }),
  });

  if (!res.ok) {
    console.error("[email] sendgrid failed", res.status, await res.text());
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
