import { describe, expect, it } from "vitest";
import { canSeek, checkpointsFor, dueCheckpoint, formatTime, frontierOf, rangesGradient, rewindTarget, type Checkpoint } from "./player";

const cp = (at: number): Checkpoint => ({ at, prompt: "?", options: ["a", "b"], answer: 0, source: "content" });
const words = ["one", "two", "three", "four", "five"].map((w, i) => ({ id: `w${i}`, word: w, meaning: `م${i}`, example: "" }));

describe("seeking", () => {
  it("allows going back but not past what was played", () => {
    expect(canSeek(30, 100)).toBe(true);
    expect(canSeek(101, 100)).toBe(true);
    expect(canSeek(140, 100)).toBe(false);
  });

  it("finds the furthest played second", () => {
    expect(frontierOf([])).toBe(0);
    expect(
      frontierOf([
        [0, 40],
        [60, 75],
      ]),
    ).toBe(75);
  });
});

describe("surprise questions", () => {
  const list = [cp(60), cp(120)];

  it("fires when playback crosses the question", () => {
    expect(dueCheckpoint(list, 59.5, 60.1, new Set())?.at).toBe(60);
    expect(dueCheckpoint(list, 61, 62, new Set())).toBeNull();
  });

  it("skips answered questions and seeks", () => {
    expect(dueCheckpoint(list, 59.5, 60.1, new Set([60]))).toBeNull();
    expect(dueCheckpoint(list, 10, 119.9, new Set())).toBeNull();
  });

  it("rewinds to the previous question or 45 seconds back", () => {
    expect(rewindTarget(list, 120)).toBe(60);
    expect(rewindTarget(list, 60)).toBe(15);
    expect(rewindTarget(list, 30)).toBe(0);
  });

  it("uses the questions written for the video, in order, and drops broken ones", () => {
    const got = checkpointsFor(
      "v",
      300,
      [
        { at_sec: 200, prompt_ar: "ب", options: ["x", "y"], answer: 1 },
        { at_sec: 90, prompt_ar: "أ", options: ["x", "y"], answer: 0 },
        { at_sec: 100, prompt_ar: "خطأ", options: ["x", "y"], answer: 3 },
        { at_sec: 400, prompt_ar: "بعد النهاية", options: ["x", "y"], answer: 0 },
      ],
      words,
    );
    expect(got.map((c) => c.prompt)).toEqual(["أ", "ب"]);
    expect(got[0].source).toBe("content");
  });

  it("falls back to two questions about the unit's words", () => {
    const got = checkpointsFor("v", 300, undefined, words);
    expect(got.map((c) => c.at)).toEqual([100, 200]);
    for (const c of got) {
      expect(c.source).toBe("words");
      expect(c.options[c.answer]).toMatch(/^م/);
    }
    expect(checkpointsFor("v", 30, undefined, words)).toEqual([]);
  });
});

describe("display", () => {
  it("formats time", () => {
    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(605.7)).toBe("10:05");
  });

  it("draws watched parts on the timeline", () => {
    expect(rangesGradient([], 100, "red")).toBe("none");
    expect(rangesGradient([[0, 50]], 100, "red")).toContain("red 50%");
  });
});
