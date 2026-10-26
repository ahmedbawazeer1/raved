import { describe, expect, it } from "vitest";
import { authErrorMessage, dbErrorMessage } from "./errors";

describe("error messages", () => {
  it("maps known auth codes to Arabic", () => {
    expect(authErrorMessage({ code: "invalid_credentials" })).toContain("غير صحيحة");
  });
  it("maps rate limits by status", () => {
    expect(authErrorMessage({ status: 429 })).toContain("انتظر");
  });
  it("falls back to a generic Arabic message", () => {
    expect(authErrorMessage({ code: "weird" })).toContain("خطأ");
    expect(dbErrorMessage({ message: "something else" })).toContain("خطأ");
  });
  it("maps SQL function errors", () => {
    expect(dbErrorMessage({ message: "recommendation_required" })).toContain("توصية");
  });
});
