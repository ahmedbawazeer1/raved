import { describe, expect, it } from "vitest";
import { DEFAULT_AVATAR } from "./avatar";
import { riverLayout, riverMarkup, WORLDS, worldFor } from "./river";

describe("river map", () => {
  it("one world per level", () => {
    expect(worldFor("A1").id).toBe("spring");
    expect(worldFor("A2+").id).toBe("valley");
    expect(worldFor("B1").id).toBe("river");
    expect(worldFor("B2").id).toBe("delta");
    expect(worldFor("IELTS").id).toBe("sea");
    expect(Object.keys(WORLDS)).toHaveLength(5);
  });
  it("grows with the units and keeps pads inside the map", () => {
    const l = riverLayout(25);
    expect(l.points).toHaveLength(25);
    expect(l.height).toBeGreaterThan(l.points[24].y);
    l.points.forEach((p) => {
      expect(p.x).toBeGreaterThan(60);
      expect(p.x).toBeLessThan(300);
    });
  });
  it("draws the boat only with an avatar, at the current pad", () => {
    const nodes = [
      { state: "done" as const, label: "1" },
      { state: "now" as const, label: "2" },
      { state: "locked" as const, label: "3" },
    ];
    const { markup } = riverMarkup({ world: WORLDS.spring, nodes });
    expect(markup).not.toContain('class="boat"');
    expect(markup.match(/class="rip"/g)).toHaveLength(2);
    expect(riverMarkup({ world: WORLDS.spring, nodes, avatar: DEFAULT_AVATAR }).markup).toContain('class="boat"');
  });
});
