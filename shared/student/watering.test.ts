import { describe, expect, it } from "vitest";
import { isFriday, longestWatering, watering } from "./watering";

// 2026-11-06 is a Friday. Times at noon UTC = 3pm in Aden.
const at = (d: string) => `${d}T12:00:00Z`;
const now = (d: string) => new Date(at(d));

describe("watering", () => {
  it("knows Fridays", () => {
    expect(isFriday("2026-11-06")).toBe(true);
    expect(isFriday("2026-11-07")).toBe(false);
  });

  it("counts a run and Friday does not break it", () => {
    const w = watering([at("2026-11-04"), at("2026-11-05"), at("2026-11-07")], now("2026-11-07"));
    expect(w.days).toBe(3);
    expect(w.state).toBe("watered");
  });

  it("waits during the day, then gets thirsty after a missed day", () => {
    expect(watering([at("2026-11-08")], now("2026-11-09")).state).toBe("waiting");
    const w = watering([at("2026-11-07")], now("2026-11-09"));
    expect(w.state).toBe("thirsty");
    expect(w.days).toBe(0);
  });

  it("rests on Friday", () => {
    expect(watering([at("2026-11-05")], now("2026-11-06")).state).toBe("rest");
  });

  it("new students have nothing to water yet", () => {
    expect(watering([], now("2026-11-09")).state).toBe("new");
  });

  it("fills the Saturday→Friday week", () => {
    const w = watering([at("2026-11-07"), at("2026-11-09")], now("2026-11-09"));
    expect(w.todayIndex).toBe(2); // Monday
    expect(w.week).toEqual([true, false, true, false, false, false, false]);
  });

  it("finds the longest run ever (Friday does not break it)", () => {
    expect(longestWatering([])).toBe(0);
    // Wed, Thu, (Fri rest), Sat, then a gap, then Tue.
    expect(longestWatering([at("2026-11-04"), at("2026-11-05"), at("2026-11-07"), at("2026-11-10")])).toBe(3);
  });
});
