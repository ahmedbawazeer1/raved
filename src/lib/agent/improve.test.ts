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
