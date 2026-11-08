import { describe, expect, it } from "vitest";
import { HEADWEAR_ITEMS, HIJAB_ITEMS, isUnlocked, wearable } from "./wardrobe";

describe("wardrobe", () => {
  it("unlocks items with stamps", () => {
    const emama = HEADWEAR_ITEMS.find((i) => i.key === "emama")!;
    expect(isUnlocked(emama, 2)).toBe(false);
    expect(isUnlocked(emama, 3)).toBe(true);
  });

  it("falls back to the free item when the choice is still locked", () => {
    expect(wearable(HEADWEAR_ITEMS, "emama", 0)).toBe("kufi");
    expect(wearable(HEADWEAR_ITEMS, "emama", 5)).toBe("emama");
    expect(wearable(HIJAB_ITEMS, "unknown", 9)).toBe("plum");
  });
});
