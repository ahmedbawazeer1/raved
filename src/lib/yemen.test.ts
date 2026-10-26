import { describe, expect, it } from "vitest";
import { ageFrom, formatYemeniMobileLocal, maskPhone, normalizeYemeniMobile } from "./yemen";

describe("normalizeYemeniMobile", () => {
  it.each([
    ["77 123 4567", "+967771234567"],
    ["771234567", "+967771234567"],
    ["+967 77 123 4567", "+967771234567"],
    ["00967-73-123-4567", "+967731234567"],
    ["967711234567", "+967711234567"],
    ["0771234567", "+967771234567"],
    ["٧٧١٢٣٤٥٦٧", "+967771234567"],
  ])("accepts %s", (input, expected) => {
    expect(normalizeYemeniMobile(input)).toBe(expected);
  });

  it.each(["", "12345", "671234567", "7712345678", "+966551234567", "01234567", "abc"])("rejects %s", (input) => {
    expect(normalizeYemeniMobile(input)).toBeNull();
  });
});

describe("phone display", () => {
  it("formats local", () => expect(formatYemeniMobileLocal("+967771234567")).toBe("77 123 4567"));
  it("masks all but last 3", () => expect(maskPhone("+967771234567")).toBe("+967 ••••••567"));
});

describe("ageFrom", () => {
  it("counts whole years", () => {
    expect(ageFrom("2010-03-14", new Date(2026, 2, 13))).toBe(15);
    expect(ageFrom("2010-03-14", new Date(2026, 2, 14))).toBe(16);
  });
});
