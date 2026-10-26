import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { bankProblems, placementBankSchema } from "./bank";
import { applyAnswer, computeResult, initialState, LEVELS, MAX_QUESTIONS, type Level } from "./engine";

const file = JSON.parse(readFileSync(path.join(process.cwd(), "content", "english", "placement.json"), "utf8"));

describe("English placement bank", () => {
  it("is valid and covers every level and skill", () => {
    const bank = placementBankSchema.parse(file);
    expect(bankProblems(bank)).toEqual([]);
    expect(bank.questions.length).toBeGreaterThanOrEqual(40);
  });

  it("does not always put the correct answer in the same place", () => {
    const bank = placementBankSchema.parse(file);
    for (const level of LEVELS) {
      const positions = new Set(bank.questions.filter((q) => q.level === level).map((q) => q.answer));
      expect(positions.size).toBeGreaterThan(1);
    }
  });

  it("rejects an answer index outside the options", () => {
    const bad = { ...file, questions: [{ ...file.questions[0], answer: 5 }, ...file.questions.slice(1)] };
    expect(placementBankSchema.safeParse(bad).success).toBe(false);
  });
});

describe("placement with the real bank", () => {
  const bank = placementBankSchema.parse(file);
  const engineBank = bank.questions.map((q, i) => ({ id: q.id, level: q.level, skill: q.skill, position: i }));

  function place(top: Level | null) {
    let state = initialState(engineBank);
    while (!state.finished) {
      const q = bank.questions.find((b) => b.id === state.currentQuestionId)!;
      const knows = top !== null && LEVELS.indexOf(q.level) <= LEVELS.indexOf(top);
      state = applyAnswer(state, engineBank, q.id, knows ? q.answer : null, q.answer);
    }
    return state;
  }

  it.each([null, "A1", "A2", "B1", "B2"] as const)("a student who knows up to %s is placed sensibly", (top) => {
    const state = place(top);
    expect(computeResult(state.answers).overall).toBe(top ?? "A1");
    expect(state.answers.length).toBeLessThanOrEqual(MAX_QUESTIONS);
    expect(state.answers.length).toBeGreaterThanOrEqual(8);
  });
});
