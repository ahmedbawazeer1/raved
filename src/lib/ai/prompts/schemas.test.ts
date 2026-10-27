import { describe, expect, it } from "vitest";
import { speakingSchema } from "./speaking";
import { writingSchema } from "./writing";

const writing = {
  scores: { task_achievement: 3, coherence: "4", vocabulary: 2.6, grammar: 9 },
  estimated_cefr: "a2 +",
  errors: Array.from({ length: 8 }, (_, i) => ({ text: `w${i}`, correction: "c", explanation_ar: "ش".repeat(260), optional: i === 0 ? "true" : undefined })),
  strengths_ar: "جيد",
  next_step_ar: "تابع",
};

describe("lenient AI output schemas", () => {
  it("repairs small differences instead of rejecting the evaluation", () => {
    const out = writingSchema.parse(writing);
    expect(out.scores).toEqual({ task_achievement: 3, coherence: 4, vocabulary: 3, grammar: 5 });
    expect(out.estimated_cefr).toBe("A2+");
    expect(out.errors).toHaveLength(6);
    expect(out.errors[0].optional).toBe(true);
    expect(out.errors[1].optional).toBe(false);
    expect(out.errors[0].explanation_ar.length).toBe(200);
  });

  it("still rejects answers with a missing part or an unknown level", () => {
    expect(writingSchema.safeParse({ ...writing, scores: undefined }).success).toBe(false);
    expect(writingSchema.safeParse({ ...writing, estimated_cefr: "C1" }).success).toBe(false);
    expect(speakingSchema.safeParse({ scores: { task: 4, fluency: 3, grammar: 3, vocabulary: 3 } }).success).toBe(false);
  });
});
