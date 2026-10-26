import { describe, expect, it } from "vitest";
import { formatBytes, validateRecommendationFile } from "./compress";

describe("recommendation files", () => {
  it("accepts photos of any size (they get compressed) and small PDFs", () => {
    expect(validateRecommendationFile({ type: "image/jpeg", size: 8_000_000 })).toBeNull();
    expect(validateRecommendationFile({ type: "image/heic", size: 3_000_000 })).toBeNull();
    expect(validateRecommendationFile({ type: "application/pdf", size: 1_000_000 })).toBeNull();
  });

  it("rejects big PDFs and other types", () => {
    expect(validateRecommendationFile({ type: "application/pdf", size: 3_000_000 })).toContain("2MB");
    expect(validateRecommendationFile({ type: "application/zip", size: 10 })).toContain("PDF");
  });

  it("formats sizes", () => {
    expect(formatBytes(600 * 1024)).toBe("600KB");
    expect(formatBytes(1.4 * 1024 * 1024)).toBe("1.4MB");
  });
});
