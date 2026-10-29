import { describe, expect, it } from "vitest";
import { choiceRound, distractors, heardWord, normalizeText, sameText, scramble, seededRandom, shuffle, singleWords, swipeCards, type GameWord } from "./logic";

const words: GameWord[] = [
  { id: "1", word: "hello", meaning: "مرحباً", example: "Hello, Ali." },
  { id: "2", word: "name", meaning: "اسم", example: "What's your name?" },
  { id: "3", word: "student", meaning: "طالب", example: "I am a student." },
  { id: "4", word: "years old", meaning: "من العمر", example: "I'm 15 years old." },
  { id: "5", word: "friend", meaning: "صديق", example: "She is my friend." },
];

describe("random helpers", () => {
  it("is deterministic for a seed", () => {
    expect(shuffle([1, 2, 3, 4, 5], seededRandom("a"))).toEqual(shuffle([1, 2, 3, 4, 5], seededRandom("a")));
  });

  it("keeps every item when shuffling", () => {
    expect(shuffle([1, 2, 3, 4, 5]).sort()).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("choices", () => {
  it("never repeats the target or a meaning", () => {
    const d = distractors(words[0], words, 3, seededRandom("x"));
    expect(d).toHaveLength(3);
    expect(d.map((w) => w.id)).not.toContain("1");
    expect(new Set(d.map((w) => w.meaning)).size).toBe(3);
  });

  it("puts the target among the options", () => {
    const round = choiceRound(words[2], words, 4, seededRandom("y"));
    expect(round).toHaveLength(4);
    expect(round.map((w) => w.id)).toContain("3");
  });
});

describe("text", () => {
  it("ignores case, punctuation and curly apostrophes", () => {
    expect(normalizeText("  What’s YOUR name?! ")).toBe("what's your name");
    expect(sameText("what's your name", "What's your name?")).toBe(true);
    expect(sameText("what is your name", "What's your name?")).toBe(false);
  });

  it("accepts a heard word among alternatives or inside a phrase", () => {
    expect(heardWord(["Hello there"], "hello")).toBe(true);
    expect(heardWord(["yellow", "hello"], "Hello")).toBe(true);
    expect(heardWord(["help"], "hello")).toBe(false);
  });
});

describe("spelling and swipe", () => {
  it("scrambles letters without returning the word", () => {
    const s = scramble("friend", seededRandom("s"));
    expect(s.sort().join("")).toBe("definr");
    expect(scramble("friend", seededRandom("s")).join("")).not.toBe("friend");
  });

  it("keeps single words only for spelling", () => {
    expect(singleWords(words).map((w) => w.word)).toEqual(["hello", "name", "student", "friend"]);
  });

  it("mixes true and false swipe cards", () => {
    const cards = swipeCards(words, 4, seededRandom("w"));
    expect(cards).toHaveLength(4);
    expect(cards.some((c) => c.correct)).toBe(true);
    expect(cards.some((c) => !c.correct)).toBe(true);
    for (const c of cards) expect(c.correct).toBe(c.meaning === c.word.meaning);
  });
});
