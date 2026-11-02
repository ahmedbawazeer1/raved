/** Outfits for the companion, unlocked by collecting stamps (passed units). */
export interface WardrobeItem {
  key: string;
  label: string;
  /** Stamps needed. */
  stamps: number;
}

export const HEADWEAR_ITEMS: WardrobeItem[] = [
  { key: "kufi", label: "كوفية", stamps: 0 },
  { key: "none", label: "بدون", stamps: 0 },
  { key: "emama", label: "عمامة حضرمية", stamps: 3 },
];

export const HIJAB_ITEMS: WardrobeItem[] = [
  { key: "plum", label: "بنفسجي", stamps: 0 },
  { key: "teal", label: "أخضر", stamps: 2 },
  { key: "navy", label: "كحلي", stamps: 4 },
  { key: "rose", label: "وردي", stamps: 6 },
];

export function isUnlocked(item: WardrobeItem, stamps: number): boolean {
  return stamps >= item.stamps;
}

/** The chosen item if it is unlocked, otherwise the first (free) one. */
export function wearable(items: WardrobeItem[], chosen: string, stamps: number): string {
  const item = items.find((i) => i.key === chosen);
  return item && isUnlocked(item, stamps) ? item.key : items[0].key;
}
