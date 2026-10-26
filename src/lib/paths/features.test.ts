import { describe, expect, it } from "vitest";
import { durationLabel, parseFeatures } from "./features";

describe("path features", () => {
  it("parses missing and non-boolean flags as false", () => {
    expect(parseFeatures({ vocab: true, speaking: "yes" })).toEqual({
      placement: false, vocab: true, speaking: false, writing: false, exam_track: false, projects: false,
    });
    expect(parseFeatures(null).vocab).toBe(false);
  });

  it("formats durations in Arabic", () => {
    expect(durationLabel(36, 25)).toBe("3 سنوات · 25 دقيقة يومياً");
    expect(durationLabel(24, 20)).toBe("سنتان · 20 دقيقة يومياً");
    expect(durationLabel(6, 25)).toBe("6 أشهر · 25 دقيقة يومياً");
    expect(durationLabel(null, 25)).toBeNull();
  });
});
