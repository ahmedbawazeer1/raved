import { describe, expect, it } from "vitest";
import { AVATAR_ITEMS, DEFAULT_AVATAR, avatarMarkup, parseAvatar, wearableItems } from "./avatar";
import { GUARDIANS, guardianFor, guardianMarkup } from "./guardians";
import { mix, paint } from "./paint";
import { RAFED_MOUTHS, rafedMarkup, stageFor } from "./rafed";
import { WORLDS, riverMarkup } from "./river";

const noProgress = { unitsPassed: 0, levelsDone: 0, gamesWon: 0, bestWatering: 0, champion: false, pathDone: false };

describe("paint", () => {
  it("lightens and darkens colours", () => {
    expect(mix("#000000", 1)).toBe("#ffffff");
    expect(mix("#ffffff", -1)).toBe("#000000");
  });
  it("collects one gradient per colour with the prefix", () => {
    const P = paint("x");
    expect(P.rg("#22B38A")).toBe(P.rg("#22B38A"));
    expect(P.defs().match(/<radialGradient id="x/g)).toHaveLength(1);
  });
});

describe("rafed", () => {
  it("grows with the levels", () => {
    expect(stageFor(0)).toBe(1);
    expect(stageFor(1)).toBe(2);
    expect(stageFor(9)).toBe(4);
    expect(stageFor(2, true)).toBe(5);
  });
  it("keeps ids unique per drawing and shows the pose", () => {
    const a = rafedMarkup({ id: "a1", mood: "sad" });
    expect(a).toContain('id="a1m"');
    expect(a).toContain(RAFED_MOUTHS.sad);
    expect(rafedMarkup({ id: "b2", filters: false })).not.toContain("<filter");
  });
  it("all mouths share one path structure (they morph)", () => {
    const shape = (d: string) => d.replace(/[\d.-]+/g, "n");
    const first = shape(RAFED_MOUTHS.smile);
    Object.values(RAFED_MOUTHS).forEach((d) => expect(shape(d)).toBe(first));
  });
});

describe("avatar", () => {
  it("rejects unknown values from storage", () => {
    expect(parseAvatar({ skin: "#123456", hair: "mohawk", items: ["crown", "laser"] })).toEqual({ ...DEFAULT_AVATAR, items: ["crown"] });
  });
  it("only shows items the student has earned", () => {
    const cfg = { ...DEFAULT_AVATAR, items: AVATAR_ITEMS.map((i) => i.key) };
    expect(wearableItems(cfg, noProgress)).toEqual(["glasses"]);
    expect(wearableItems(cfg, { ...noProgress, unitsPassed: 1, levelsDone: 1 })).toEqual(expect.arrayContaining(["glasses", "scarf", "backpack"]));
  });
  it("draws a hijab with no ears", () => {
    const m = avatarMarkup({ ...DEFAULT_AVATAR, hair: "hijab" }, { id: "h" });
    expect(m).toContain('class="hjb"');
  });
});

describe("guardians", () => {
  it("one guardian per world, chosen by level", () => {
    expect(GUARDIANS).toHaveLength(5);
    expect(guardianFor("A1").id).toBe("spring");
    expect(guardianFor("B2").id).toBe("delta");
    expect(guardianFor("IELTS").id).toBe("sea");
    expect(guardianFor(null).id).toBe("spring");
    expect(guardianMarkup("river", true)).toContain("stroke-linecap");
  });
});

describe("every drawing is self-contained", () => {
  // A fill that points to a gradient the drawing does not define is drawn black by the mobile app
  // (and invisible on the web), so every url(#id) must have its id inside the same markup.
  const undefinedFills = (markup: string) => {
    const ids = new Set([...markup.matchAll(/id="([^"]+)"/g)].map((m) => m[1]));
    return [...new Set([...markup.matchAll(/url\(#([^)]+)\)/g)].map((m) => m[1]))].filter((u) => !ids.has(u));
  };

  it("river map, in every world and node state", () => {
    for (const world of Object.values(WORLDS)) {
      const { markup } = riverMarkup({
        world,
        id: "t",
        avatar: { ...DEFAULT_AVATAR, hair: "hijab" },
        nodes: (["done", "now", "open", "locked"] as const).map((state) => ({ state, label: "x" })),
      });
      expect(undefinedFills(markup)).toEqual([]);
    }
  });

  it("rafed, the avatar and the guardians", () => {
    for (const stage of [1, 2, 3, 4, 5] as const) expect(undefinedFills(rafedMarkup({ stage, id: "r" }))).toEqual([]);
    expect(undefinedFills(avatarMarkup({ ...DEFAULT_AVATAR, items: AVATAR_ITEMS.map((i) => i.key) }, { id: "a" }))).toEqual([]);
    for (const g of GUARDIANS) expect(undefinedFills(guardianMarkup(g.id, false, "g"))).toEqual([]);
  });
});
