import { describe, expect, it } from "vitest";
import { parsePrefs } from "./fx";

describe("parsePrefs", () => {
  it("defaults to effects on and Hamza", () => {
    expect(parsePrefs(null)).toEqual({ effects: true, companion: "hamza", headwear: "kufi", hijab: "plum" });
    expect(parsePrefs("not json")).toEqual({ effects: true, companion: "hamza", headwear: "kufi", hijab: "plum" });
  });

  it("reads saved choices and ignores unknown values", () => {
    expect(parsePrefs('{"effects":false,"companion":"reem"}')).toEqual({ effects: false, companion: "reem", headwear: "kufi", hijab: "plum" });
    expect(parsePrefs('{"effects":"x","companion":"other"}')).toEqual({ effects: true, companion: "hamza", headwear: "kufi", hijab: "plum" });
  });
});
