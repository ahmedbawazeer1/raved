import { describe, expect, it } from "vitest";
import { DEFAULT_AVATAR } from "@shared/art/avatar";
import { parsePrefs } from "./fx";

describe("parsePrefs", () => {
  it("defaults to effects on and the default avatar", () => {
    expect(parsePrefs(null)).toEqual({ effects: true, avatar: DEFAULT_AVATAR });
    expect(parsePrefs("not json")).toEqual({ effects: true, avatar: DEFAULT_AVATAR });
  });

  it("reads saved choices and ignores unknown values", () => {
    const p = parsePrefs('{"effects":false,"avatar":{"face":"oval","hair":"hijab","skin":"#E9BC96","hairColor":"#000000","items":["crown","x"]}}');
    expect(p.effects).toBe(false);
    expect(p.avatar).toMatchObject({ face: "oval", hair: "hijab", skin: "#E9BC96", hairColor: DEFAULT_AVATAR.hairColor, items: ["crown"] });
    expect(parsePrefs('{"effects":"x"}')).toEqual({ effects: true, avatar: DEFAULT_AVATAR });
  });

  it("turns an old Reem choice into a hijab avatar", () => {
    expect(parsePrefs('{"companion":"reem"}').avatar.hair).toBe("hijab");
  });
});
