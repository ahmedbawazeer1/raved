import { describe, expect, it } from "vitest";
import { cleanErrorReport, cleanPage } from "./report";

describe("error reports", () => {
  it("keeps the path only and hides ids", () => {
    expect(cleanPage("https://raved-seven.vercel.app/student/learn/6f1c2d3e-1111-4222-8333-944455556666?token=abc#x")).toBe("/student/learn/:id");
    expect(cleanPage("/login?next=/student")).toBe("/login");
    expect(cleanPage(undefined)).toBeNull();
  });

  it("removes personal data and cuts long messages", () => {
    const r = cleanErrorReport({ message: "Failed for ali@example.com phone 771234567 " + "x".repeat(900), digest: "abc 123!", page: "/apply" });
    expect(r.message).not.toContain("ali@example.com");
    expect(r.message).not.toContain("771234567");
    expect(r.message.length).toBeLessThanOrEqual(500);
    expect(r.digest).toBe("abc123");
    expect(r.page).toBe("/apply");
  });
});
