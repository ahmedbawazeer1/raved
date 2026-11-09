import { describe, expect, it } from "vitest";
import { opponentAt, type Opponent } from "../arena/games";
import { parseLeague, resultText, tierOf, zoneOf } from "./league";

describe("water league", () => {
  it("has promotion and demotion zones (no demotion from the first two tiers)", () => {
    expect(zoneOf(5, 20, 0)).toBe("up");
    expect(zoneOf(6, 20, 0)).toBe("safe");
    expect(zoneOf(20, 20, 1)).toBe("safe");
    expect(zoneOf(16, 20, 2)).toBe("down");
    expect(zoneOf(15, 20, 2)).toBe("safe");
    expect(zoneOf(1, 20, 5)).toBe("safe"); // the ocean has nowhere higher
    expect(zoneOf(6, 8, 3)).toBe("down");
  });

  it("announces results without blame", () => {
    expect(resultText({ outcome: "up", rank: 2, xp: 90, from_tier: 0, to_tier: 1 }).title).toBe("صعدت إلى «جدول»!");
    expect(resultText({ outcome: "down", rank: 19, xp: 5, from_tier: 3, to_tier: 2 }).body).toContain("يمكنك الصعود");
    expect(tierOf(9).name).toBe("محيط");
  });

  it("reads old and new league answers", () => {
    expect(parseLeague(null).rows).toEqual([]);
    expect(parseLeague({ rows: [{ rank: 1, xp: 3, me: true, name: "أنت" }], me: { rank: 1, xp: 3, joined: true } }).me?.rank).toBe(1);
  });
});

describe("arena opponent", () => {
  it("fills along the recorded timeline", () => {
    const op: Opponent = {
      kind: "bot",
      name: "قطرة",
      score: 2,
      timeline: [
        { t: 1000, ok: true },
        { t: 2500, ok: false },
        { t: 4000, ok: true },
      ],
    };
    expect(opponentAt(op, 500)).toEqual({ answered: 0, right: 0 });
    expect(opponentAt(op, 3000)).toEqual({ answered: 2, right: 1 });
    expect(opponentAt(op, 9000)).toEqual({ answered: 3, right: 2 });
  });
});
