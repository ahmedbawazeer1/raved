import { z } from "zod";
import { atMost, cefr, flag, score, text } from "./shared";

/** docs/AI_PROMPTS.md §2. Bump the version whenever the prompt or schema changes. */
export const WRITING_PROMPT_VERSION = "writing-v1";

export const WRITING_SYSTEM = `You are an experienced English teacher marking a short piece of writing by an Arabic-speaking secondary-school student in Yemen, using criteria similar to international exams but adapted to the student's level.
Criteria (integers 1-5): task_achievement, coherence, vocabulary, grammar — relative to the stated CEFR level.
Find errors in the text. For each error return the exact substring as it appears (so the app can highlight it), the correction, and a short explanation in Modern Standard Arabic. Max 6 errors, most important first. Mark optional style improvements with "optional": true.
Also give estimated_cefr, strengths_ar (one sentence), and next_step_ar (one sentence).
Do not rewrite the whole text. Do not write the task for the student.
Return ONLY JSON matching the schema.`;

export function writingUserMessage(v: { prompt: string; level: string; minWords: number; maxWords: number; text: string }): string {
  return `TASK: ${v.prompt}
LEVEL: ${v.level}
WORD LIMITS: ${v.minWords}-${v.maxWords}
TEXT: """${v.text}"""`;
}

export const writingSchema = z.object({
  scores: z.object({ task_achievement: score, coherence: score, vocabulary: score, grammar: score }),
  estimated_cefr: cefr,
  errors: atMost(z.object({ text: z.string(), correction: z.string(), explanation_ar: text(200), optional: flag }), 6),
  strengths_ar: text(200),
  next_step_ar: text(200),
});
export type WritingFeedback = z.output<typeof writingSchema>;
