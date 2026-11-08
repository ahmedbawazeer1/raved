import { describe, expect, it } from "vitest";
import { improvePrompt, needsImprovement, questionStats, weakQuestions } from "./improve";

const attempt = (q1: boolean, q2: boolean) => ({
  passed: q1 && q2,
  results: [
    { id: "q1", prompt: "am / is", correct: q1 },
    { id: "q2", prompt: "Where?", correct: q2 },
  ],
});

describe("self-improvement", () => {
  const attempts = [attempt(true, false), attempt(true, false), attempt(true, false), attempt(false, false), attempt(true, true), attempt(true, false)];
  const base = questionStats(attempts);
  const stats = { ...base, lessonsNotUseful: [] };

  it("aggregates quiz results per question", () => {
    expect(base.attempts).toBe(6);
    expect(base.questions.find((q) => q.id === "q1")?.correctRate).toBeCloseTo(5 / 6);
    expect(base.questions.find((q) => q.id === "q2")?.correctRate).toBeCloseTo(1 / 6);
  });

  it("finds the weak questions and flags the unit", () => {
    expect(weakQuestions(stats).map((q) => q.id)).toEqual(["q2"]);
    expect(needsImprovement(stats)).toBe(true);
  });

  it("waits for enough attempts", () => {
    expect(needsImprovement({ ...questionStats(attempts.slice(0, 3)), lessonsNotUseful: [] })).toBe(false);
  });

  it("ignores malformed results", () => {
    expect(questionStats([{ passed: false, results: "x" }]).questions).toEqual([]);
  });

  it("tells the agent what failed", () => {
    expect(improvePrompt({ code: "A1-01" }, stats, "{}")).toContain("q2 (17% correct)");
  });
});

describe("item analysis", () => {
  const attempt = (correct: number, answers: Record<string, boolean>) => ({
    correct,
    results: Object.entries(answers).map(([id, ok]) => ({ id, prompt: id, correct: ok })),
  });

  it("flags a question the best students get wrong (miskeyed) and one everybody gets right", async () => {
    const { itemAnalysis } = await import("./improve");
    const attempts = [
      ...Array.from({ length: 6 }, () => attempt(9, { good: true, easy: true, trap: false })),
      ...Array.from({ length: 6 }, () => attempt(5, { good: true, easy: true, trap: true })),
      ...Array.from({ length: 6 }, () => attempt(2, { good: false, easy: true, trap: true })),
    ];
    const stats = Object.fromEntries(itemAnalysis(attempts).map((s) => [s.id, s]));
    expect(stats.trap.flag).toBe("miskeyed");
    expect(stats.easy.flag).toBe("too_easy");
    expect(stats.good.flag).toBe(null);
    expect(stats.good.discrimination).toBeGreaterThan(0.5);
  });

  it("does not flag anything with too few answers", async () => {
    const { itemAnalysis } = await import("./improve");
    expect(itemAnalysis([attempt(1, { q: false })]).every((s) => s.flag === null)).toBe(true);
  });
});
