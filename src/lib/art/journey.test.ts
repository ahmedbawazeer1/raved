import { describe, expect, it } from "vitest";
import { journeyLayout, landmarks, roadPath, sceneryMarkup, stopIcon } from "./journey";

describe("journeyLayout", () => {
  it("starts at the bottom and climbs one step per unit", () => {
    const l = journeyLayout(5);
    expect(l.stops).toHaveLength(5);
    for (let i = 1; i < 5; i++) expect(l.stops[i].y).toBeLessThan(l.stops[i - 1].y);
    expect(l.stops[0].y).toBeLessThan(l.seaTop);
    expect(l.stops[4].y).toBeGreaterThan(200);
  });

  it("keeps every stop inside the map width", () => {
    for (const s of journeyLayout(25).stops) {
      expect(s.x - 46).toBeGreaterThanOrEqual(0);
      expect(s.x + 46).toBeLessThanOrEqual(390);
    }
  });

  it("handles an empty path", () => {
    expect(journeyLayout(0).stops).toHaveLength(1);
  });
});

describe("roadPath", () => {
  it("draws one curve per step, up to the given stop", () => {
    const { stops } = journeyLayout(4);
    expect(roadPath(stops).match(/C/g)).toHaveLength(3);
    expect(roadPath(stops, 1).match(/C/g)).toHaveLength(1);
    expect(roadPath(stops, 0)).not.toContain("C");
  });
});

describe("stopIcon", () => {
  it("knows Hadramout places", () => {
    expect(stopIcon("المكلا", 0)).toBe("art-i-dome");
    expect(stopIcon("ميناء المكلا", 0)).toBe("art-i-boat");
    expect(stopIcon("شبام", 0)).toBe("art-i-towers");
    expect(stopIcon("تريم", 0)).toBe("art-i-minaret");
  });

  it("falls back to general icons", () => {
    expect(stopIcon(null, 0)).toBe("art-i-palm");
    expect(stopIcon("مكان آخر", 1)).toBe("art-i-mountain");
  });
});

describe("landmarks and scenery", () => {
  it("adds the valley landmarks only on tall maps", () => {
    expect(landmarks(journeyLayout(1)).map((l) => l.key)).not.toContain("minaret");
    expect(landmarks(journeyLayout(10)).map((l) => l.key)).toContain("minaret");
  });

  it("every landmark teaches a word", () => {
    for (const l of landmarks(journeyLayout(10))) {
      expect(l.en).toMatch(/^[A-Z][a-z]+$/);
      expect(l.ar.length).toBeGreaterThan(1);
    }
  });

  it("draws the scenery at the map height", () => {
    const l = journeyLayout(3);
    expect(sceneryMarkup(l)).toContain(`height="${l.height}"`);
  });
});
