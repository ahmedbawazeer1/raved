import { describe, expect, it } from "vitest";
import { checkAnswer, normalizeAnswer, shuffleWords } from "./check-answer";

describe("checkAnswer", () => {
  it("checks mcq by index", () => {
    expect(checkAnswer({ kind: "mcq", answer: 2 }, 2)).toBe(true);
    expect(checkAnswer({ kind: "mcq", answer: 2 }, "2")).toBe(false);
  });
  it("normalises fill-in answers like the server", () => {
    expect(normalizeAnswer("  Are.  ")).toBe("are");
    expect(checkAnswer({ kind: "fill_blank", answer: "are" }, " ARE! ")).toBe(true);
  });
  it("checks word order", () => {
    expect(checkAnswer({ kind: "order_words", answer: ["what's", "your", "name"] }, ["What's", "your", "name"])).toBe(true);
    expect(checkAnswer({ kind: "order_words", answer: ["what's", "your", "name"] }, ["your", "what's", "name"])).toBe(false);
  });
});

describe("shuffleWords", () => {
  it("is deterministic and never returns the original order", () => {
    const words = ["what's", "your", "name"];
    expect(shuffleWords(words, "q1")).toEqual(shuffleWords(words, "q1"));
    expect(shuffleWords(words, "q1").join(" ")).not.toBe(words.join(" "));
    expect([...shuffleWords(words, "q1")].sort()).toEqual([...words].sort());
  });
});
