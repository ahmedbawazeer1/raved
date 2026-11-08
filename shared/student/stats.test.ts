import { describe, expect, it } from "vitest";
import { examTrackOpen, streakDays, yemenDate } from "./stats";

const now = new Date("2026-10-27T09:00:00Z"); // 12:00 in Aden

describe("streakDays", () => {
  it("counts consecutive days ending today", () => {
    expect(streakDays(["2026-10-27T05:00:00Z", "2026-10-26T18:00:00Z", "2026-10-25T08:00:00Z", "2026-10-23T08:00:00Z"], now)).toBe(3);
  });

  it("keeps yesterday's streak alive until the day ends", () => {
    expect(streakDays(["2026-10-26T08:00:00Z", "2026-10-25T08:00:00Z"], now)).toBe(2);
  });

  it("is zero after a missed day and ignores empty values", () => {
    expect(streakDays(["2026-10-24T08:00:00Z", null, undefined], now)).toBe(0);
    expect(streakDays([], now)).toBe(0);
  });

  it("uses Yemen time: 22:30 UTC is already the next day in Aden", () => {
    expect(yemenDate("2026-10-26T22:30:00Z")).toBe("2026-10-27");
  });
});

describe("examTrackOpen", () => {
  it("opens at B1+", () => {
    expect(examTrackOpen("B1")).toBe(false);
    expect(examTrackOpen("B1+")).toBe(true);
    expect(examTrackOpen("B2")).toBe(true);
    expect(examTrackOpen(null)).toBe(false);
  });
});
