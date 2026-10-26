import { describe, expect, it } from "vitest";
import { redact } from "./redact";

describe("redact", () => {
  it("removes Yemeni phone numbers in common formats", () => {
    for (const phone of ["+967 77 123 4567", "+967771234567", "00967-73-123-4567", "967 711 234 567", "771234567", "73 123 4567", "70-123-4567"]) {
      expect(redact(`Call me on ${phone} please`)).toBe("Call me on [PHONE] please");
    }
  });

  it("removes emails, links and long digit runs (also Arabic digits)", () => {
    expect(redact("Write to ali.saleh@gmail.com today")).toBe("Write to [EMAIL] today");
    expect(redact("see https://example.com/a?b=1 now")).toBe("see [LINK] now");
    expect(redact("My ID is 0123456789 and code ١٢٣٤٥")).toBe("My ID is [NUMBER] and code [NUMBER]");
  });

  it("keeps short numbers that are part of normal English", () => {
    expect(redact("I am 16 years old and I have 3 brothers. It costs 500 rials.")).toBe(
      "I am 16 years old and I have 3 brothers. It costs 500 rials.",
    );
    expect(redact("In 2025 I visited Aden.")).toBe("In [NUMBER] I visited Aden.");
  });

  it("removes the student's own name in Latin or Arabic letters", () => {
    expect(redact("Hello, I'm Ahmed Saleh from Taiz.", { knownNames: ["Ahmed Saleh"] })).toBe("Hello, I'm [NAME] [NAME] from Taiz.");
    expect(redact("مرحباً، أنا أحمد", { knownNames: ["أحمد صالح"] })).toBe("مرحباً، أنا [NAME]");
    // Whole words only: "Ali" must not break "Alice" or "quality".
    expect(redact("Alice has quality", { knownNames: ["Ali"] })).toBe("Alice has quality");
  });

  it("removes names the text introduces", () => {
    expect(redact("My name is Mohammed Al-Hakimi and I like football.")).toBe("My name is [NAME] and I like football.");
    expect(redact("My brother's name is Khaled.")).toBe("My brother's name is [NAME].");
    expect(redact("اسمي فاطمة علي وأدرس في المكلا")).toBe("اسمي [NAME] وأدرس في المكلا");
  });

  it("leaves text without personal data unchanged", () => {
    const text = "Yesterday we went to the market in Sana'a and bought tomatoes.";
    expect(redact(text)).toBe(text);
  });
});
