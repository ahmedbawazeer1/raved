import { describe, expect, it } from "vitest";
import type { LessonBlock } from "@/lib/content/types";
import { lessonSections } from "./sections";

const text = (s: string): LessonBlock => ({ type: "text", markdown_ar: s });
const ex = (id: string): LessonBlock => ({ type: "exercise", exercise: { id, kind: "mcq", prompt: "?", options: ["a", "b"], answer: 0, explanation_ar: "" } });

describe("lessonSections", () => {
  it("puts the mandatory video first, then one step per part", () => {
    const blocks: LessonBlock[] = [
      text("شرح 1"),
      { type: "table", headers: ["a"], rows: [["b"]] },
      ex("e1"),
      { type: "video", youtube_id: "abcdefghijk", optional: true },
      { type: "reading", text_en: "Hi" },
      ex("e2"),
      { type: "game", id: "g1", game: "match", title_ar: "وصّل الأزواج" },
      { type: "story", id: "s1", panels: [{ speaker: "Hamza", text_en: "Hi", text_ar: "مرحبا" }] },
    ];
    const s = lessonSections(blocks);
    expect(s.map((x) => x.kind)).toEqual(["video", "explain", "exercises", "reading", "game", "story"]);
    expect(s[1].blocks).toHaveLength(2);
    expect(s[2].requires).toEqual(["e1", "e2"]);
    expect(s[4].title).toBe("وصّل الأزواج");
    expect(s[5].requires).toEqual(["s1"]);
  });

  it("keeps a video that needs checking inside the explanation (it does not block)", () => {
    const s = lessonSections([{ type: "video", youtube_id: "abcdefghijk", needs_check: true }, text("x")]);
    expect(s.map((x) => x.kind)).toEqual(["explain"]);
  });

  it("returns nothing for an empty lesson", () => {
    expect(lessonSections([])).toEqual([]);
  });
});
