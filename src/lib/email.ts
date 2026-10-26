import "server-only";

/**
 * Transactional email through Resend's HTTP API (no SDK, to keep bundles small).
 * If RESEND_API_KEY is not set yet, emails are skipped: in-app notifications still work.
 */
export interface EmailMessage {
  to: string | string[];
  subject: string;
  /** Plain Arabic text. Rendered into a simple RTL HTML email. */
  text: string;
  link?: { href: string; label: string };
}

export function renderEmailHtml({ text, link }: Pick<EmailMessage, "text" | "link">): string {
  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px;line-height:1.9">${escape(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
  const button = link
    ? `<p style="margin:20px 0"><a href="${escape(link.href)}" style="background:#0E6E5C;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">${escape(link.label)}</a></p>`
    : "";
  return `<!doctype html><html lang="ar" dir="rtl"><body style="margin:0;background:#F5F7F6;font-family:Tahoma,Arial,sans-serif;color:#12201D"><div style="max-width:520px;margin:0 auto;padding:24px"><div style="background:#fff;border:1px solid #E2E8E6;border-radius:16px;padding:24px"><p style="margin:0 0 16px;font-weight:700;color:#0E6E5C;font-size:18px">رفد</p>${paragraphs}${button}</div><p style="font-size:12px;color:#4B5B57;margin-top:12px">رفد — منصة تعليمية مجانية لطلاب اليمن</p></div></body></html>`;
}

export async function sendEmail(message: EmailMessage): Promise<{ sent: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "رفد <onboarding@resend.dev>";
  if (!apiKey) return { sent: false, error: "email_not_configured" };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: message.to,
        subject: message.subject,
        text: message.link ? `${message.text}\n\n${message.link.label}: ${message.link.href}` : message.text,
        html: renderEmailHtml(message),
      }),
    });
    if (!res.ok) return { sent: false, error: `resend_${res.status}` };
    return { sent: true };
  } catch {
    return { sent: false, error: "network" };
  }
}
