import { describe, expect, it } from "vitest";
import { countWords, highlightErrors, lessonSummary } from "./text";

describe("countWords", () => {
  it("counts words, ignoring punctuation-only tokens", () => {
    expect(countWords("  My family is big . We live in Ibb!  ")).toBe(8);
    expect(countWords("")).toBe(0);
  });
});

describe("highlightErrors", () => {
  it("marks errors in order with their numbers", () => {
    const text = "I go to school yesterday and I see my friend.";
    const { segments, found } = highlightErrors(text, [{ text: "go" }, { text: "see" }, { text: "not there" }]);
    expect(found).toEqual([true, true, false]);
    expect(segments).toEqual([
      { error: null, text: "I " },
      { error: 0, text: "go" },
      { error: null, text: " to school yesterday and I " },
      { error: 1, text: "see" },
      { error: null, text: " my friend." },
    ]);
    expect(segments.map((s) => s.text).join("")).toBe(text);
  });

  it("finds a repeated substring after the previous error, and never overlaps", () => {
    const { segments, found } = highlightErrors("he go and he go", [{ text: "he go" }, { text: "he go" }, { text: "go" }]);
    expect(found).toEqual([true, true, false]);
    expect(segments.filter((s) => s.error !== null).map((s) => s.error)).toEqual([0, 1]);
  });
});

describe("lessonSummary", () => {
  it("uses explanations and tables, never exercises", () => {
    const s = lessonSummary([
      { type: "text", markdown_ar: "## القاعدة\nنستخدم **am** مع I." },
      { type: "table", headers: ["Subject", "be"], rows: [["I", "am"]] },
      { type: "exercise", exercise: { id: "x", kind: "mcq", prompt: "secret", options: ["a"], answer: 0, explanation_ar: "" } },
    ]);
    expect(s).toContain("نستخدم am مع I.");
    expect(s).toContain("I | am");
    expect(s).not.toContain("secret");
  });
});
