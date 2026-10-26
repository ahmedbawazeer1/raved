import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { renderEmailHtml, sendEmail } = await import("./email");

describe("email", () => {
  it("escapes HTML and renders RTL", () => {
    const html = renderEmailHtml({ text: "مرحباً <b>", link: { href: "https://x.test/?a=1&b=2", label: "افتح" } });
    expect(html).toContain('dir="rtl"');
    expect(html).toContain("&lt;b&gt;");
    expect(html).toContain("a=1&amp;b=2");
  });

  it("skips sending when not configured", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    expect(await sendEmail({ to: "a@b.c", subject: "s", text: "t" })).toEqual({ sent: false, error: "email_not_configured" });
    vi.unstubAllEnvs();
  });
});
