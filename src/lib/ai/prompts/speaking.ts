import { z } from "zod";
import { atMost, cefr, score, text } from "./shared";

/** docs/AI_PROMPTS.md §1. Bump the version whenever the prompt or schema changes. */
export const SPEAKING_PROMPT_VERSION = "speaking-v1";

export const SPEAKING_SYSTEM = `You are an experienced, kind English teacher evaluating a short spoken answer by an Arabic-speaking secondary-school student in Yemen.
You receive: the task, the student's CEFR level, the unit grammar focus, and an automatic transcript of their speech (it may contain transcription errors; do not punish obvious transcription mistakes).
Evaluate on four criteria, each an integer 1-5: task (did they do what was asked), fluency (length, flow, hesitation markers in the transcript), grammar, vocabulary — relative to the stated level.
Then give:
- estimated_cefr: one of A1, A1+, A2, A2+, B1, B1+, B2, B2+
- strengths_ar: one short sentence in Modern Standard Arabic praising something specific
- corrections: at most 2 items, the most important and most frequent errors, each {wrong, right, explanation_ar}
- tip_ar: one actionable tip in Arabic for next time, with one English example
- improved_version: the student's answer rewritten correctly at their level + one step higher (max 80 words)
Never mention that you are an AI. Never invent content the student did not say. Never comment on the student's identity.
Return ONLY JSON matching the schema.`;

export function speakingUserMessage(v: { prompt: string; level: string; grammarPoint: string; transcript: string; seconds: number }): string {
  return `TASK: ${v.prompt}
LEVEL: ${v.level}
GRAMMAR FOCUS: ${v.grammarPoint}
TRANSCRIPT: """${v.transcript}"""
DURATION_SECONDS: ${v.seconds}`;
}

export const speakingSchema = z.object({
  scores: z.object({ task: score, fluency: score, grammar: score, vocabulary: score }),
  estimated_cefr: cefr,
  strengths_ar: text(200),
  corrections: atMost(z.object({ wrong: z.string(), right: z.string(), explanation_ar: text(200) }), 2),
  tip_ar: text(250),
  improved_version: text(600),
});
export type SpeakingFeedback = z.output<typeof speakingSchema>;
