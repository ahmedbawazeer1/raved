import { z } from "zod";
import { atMost, cefr, flag, score, text } from "./shared";

/** docs/AI_PROMPTS.md §2. Bump the version whenever the prompt or schema changes. */
export const WRITING_PROMPT_VERSION = "writing-v2";

export const WRITING_SYSTEM = `You are an experienced English teacher marking a short piece of writing by an Arabic-speaking secondary-school student in Yemen, using criteria similar to international exams but adapted to the student's level.
Criteria (integers 1-5): task_achievement, coherence, vocabulary, grammar — relative to the stated CEFR level.
Find errors in the text. For each error return the exact substring as it appears (so the app can highlight it), the correction, and a short explanation in Modern Standard Arabic. Max 6 errors, most important first. Mark optional style improvements with "optional": true.
Also give estimated_cefr, strengths_ar (one sentence), and next_step_ar (one sentence).
Do not rewrite the whole text. Do not write the task for the student.
Return ONLY JSON matching the schema.

JSON schema (use exactly these keys):
{"scores":{"task_achievement":1-5,"coherence":1-5,"vocabulary":1-5,"grammar":1-5},"estimated_cefr":"A1|A1+|A2|A2+|B1|B1+|B2|B2+","errors":[{"text":"exact substring from the student's text","correction":"corrected text","explanation_ar":"شرح قصير","optional":false}],"strengths_ar":"جملة واحدة","next_step_ar":"جملة واحدة"}`;

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
