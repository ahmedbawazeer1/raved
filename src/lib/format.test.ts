import { describe, expect, it } from "vitest";
import { formatBytes } from "./format";

describe("formatBytes", () => {
  it("formats sizes", () => {
    expect(formatBytes(600 * 1024)).toBe("600KB");
    expect(formatBytes(1.4 * 1024 * 1024)).toBe("1.4MB");
  });
});
