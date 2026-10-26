import { z } from "zod";
import { CEFR_ESTIMATES } from "./shared";

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

const score = z.number().int().min(1).max(5);
export const writingSchema = z.object({
  scores: z.object({ task_achievement: score, coherence: score, vocabulary: score, grammar: score }),
  estimated_cefr: z.enum(CEFR_ESTIMATES),
  errors: z
    .array(z.object({ text: z.string(), correction: z.string(), explanation_ar: z.string().max(200), optional: z.boolean().default(false) }))
    .max(6),
  strengths_ar: z.string().max(200),
  next_step_ar: z.string().max(200),
});
export type WritingFeedback = z.infer<typeof writingSchema>;
