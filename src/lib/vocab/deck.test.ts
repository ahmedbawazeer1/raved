import { describe, expect, it } from "vitest";
import { buildDeck, NEW_PER_SESSION, type DeckReview, type DeckWord } from "./deck";

const now = new Date("2026-10-26T09:00:00Z");
const word = (i: number): DeckWord => ({
  id: `w${i}`,
  word: `word${i}`,
  ipa: null,
  partOfSpeech: "noun",
  meaningAr: "معنى",
  exampleEn: "Example.",
  exampleAr: null,
  order: i,
});
const review = (i: number, dueAt: string): DeckReview => ({ vocabItemId: `w${i}`, dueAt, ease: 2.5, intervalDays: 1, repetitions: 1, lapses: 0 });

describe("buildDeck", () => {
  it("puts due words first (oldest first), then new words in curriculum order", () => {
    const words = [word(3), word(1), word(2), word(4)];
    const deck = buildDeck(words, [review(4, "2026-10-26T08:00:00Z"), review(3, "2026-10-25T08:00:00Z"), review(2, "2026-10-30T00:00:00Z")], now);
    expect(deck.cards.map((c) => c.id)).toEqual(["w3", "w4", "w1"]);
    expect(deck.dueCount).toBe(2);
    expect(deck.newCount).toBe(1);
    expect(deck.learnedCount).toBe(3);
    expect(deck.cards[0].state?.repetitions).toBe(1);
    expect(deck.cards[2].state).toBeNull();
  });

  it("limits new words per session", () => {
    const words = Array.from({ length: 25 }, (_, i) => word(i));
    expect(buildDeck(words, [], now).cards).toHaveLength(NEW_PER_SESSION);
  });

  it("says when the next word is due when nothing is left today", () => {
    const deck = buildDeck([word(1), word(2)], [review(1, "2026-10-28T00:00:00Z"), review(2, "2026-10-27T00:00:00Z")], now);
    expect(deck.cards).toHaveLength(0);
    expect(deck.nextDueAt).toBe("2026-10-27T00:00:00Z");
  });
});
