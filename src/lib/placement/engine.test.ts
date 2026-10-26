import { describe, expect, it } from "vitest";
import {
  applyAnswer,
  canRetake,
  computeResult,
  initialState,
  LEVELS,
  MAX_QUESTIONS,
  monthsToB2,
  SKILLS,
  type BankQuestion,
  type Level,
  type PlacementState,
} from "./engine";

// 10 questions per level, skills rotating; the correct answer is always 0.
const bank: BankQuestion[] = LEVELS.flatMap((level, li) =>
  Array.from({ length: 10 }, (_, i) => ({ id: `${level}-${i}`, level, skill: SKILLS[i % 4], position: li * 100 + i })),
);

/** Runs a whole test with a student who knows everything up to `knows` (inclusive). */
function run(answerFor: (level: Level) => number | null): PlacementState {
  let state = initialState(bank);
  let guard = 0;
  while (!state.finished && guard++ < 100) {
    const q = bank.find((b) => b.id === state.currentQuestionId)!;
    state = applyAnswer(state, bank, q.id, answerFor(q.level), 0);
  }
  return state;
}
const knowsUpTo = (top: Level | null) => (level: Level) => (top && LEVELS.indexOf(level) <= LEVELS.indexOf(top) ? 0 : 1);

describe("placement engine", () => {
  it("starts at A2 with one question per skill in the first block", () => {
    const state = initialState(bank);
    expect(state.level).toBe("A2");
    let s = state;
    const skills = new Set<string>();
    for (let i = 0; i < 4; i++) {
      const q = bank.find((b) => b.id === s.currentQuestionId)!;
      expect(q.level).toBe("A2");
      skills.add(q.skill);
      s = applyAnswer(s, bank, q.id, 0, 0);
    }
    expect(skills.size).toBe(4);
    expect(s.level).toBe("B1"); // 4/4 → step up
  });

  it("places a beginner at A1 when they answer «لا أعرف» to everything", () => {
    const state = run(() => null);
    expect(state.finished).toBe(true);
    expect(state.answers.every((a) => !a.correct)).toBe(true);
    expect(computeResult(state.answers).overall).toBe("A1");
  });

  it.each(["A1", "A2", "B1", "B2"] as const)("places a student who knows up to %s at %s", (top) => {
    const state = run(knowsUpTo(top));
    const result = computeResult(state.answers);
    expect(result.overall).toBe(top);
    expect(result.skills.reading).toBe(top);
    expect(state.answers.length).toBeLessThanOrEqual(MAX_QUESTIONS);
  });

  it("ignores a repeated answer for a question that is no longer current", () => {
    const s0 = initialState(bank);
    const first = s0.currentQuestionId!;
    const s1 = applyAnswer(s0, bank, first, 0, 0);
    expect(applyAnswer(s1, bank, first, 1, 0)).toBe(s1);
  });

  it("never asks the same question twice", () => {
    const state = run((level) => (level === "A2" ? 0 : 1)); // bounces between A2 and B1
    const ids = state.answers.map((a) => a.questionId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("estimates months to B2 from hours and daily minutes", () => {
    const hours = { A1: 95, A2: 100, B1: 185, B2: 200 };
    expect(monthsToB2("A1", hours, 25)).toBe(47); // 580 h at 25 min/day
    expect(monthsToB2("B2", hours, 30)).toBe(14);
    expect(monthsToB2("A1", {}, 25)).toBeNull();
  });

  it("allows a retake after 3 months", () => {
    const now = new Date("2026-10-26T00:00:00Z");
    expect(canRetake(null, now)).toBe(true);
    expect(canRetake(new Date("2026-09-01T00:00:00Z"), now)).toBe(false);
    expect(canRetake(new Date("2026-07-27T00:00:00Z"), now)).toBe(true);
  });
});
