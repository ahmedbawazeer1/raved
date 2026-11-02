/**
 * Building one unit from the approved plan (unit tested): pick the teaching video, watch it into
 * a timeline, then write the whole unit package around that one video and situation.
 */
import { z } from "zod";
import type { PlanUnit } from "./plan";
import type { VideoCandidate } from "./youtube";

export interface BuildUnitInput {
  path_slug: string;
  level: string;
  position: number;
  unit: PlanUnit;
  /** Titles of the units before this one (to build on them). */
  previous: string[];
  plan_job?: string;
}

export function parseBuildInput(input: Record<string, unknown>): BuildUnitInput | null {
  const u = input.unit as PlanUnit | undefined;
  if (!u || typeof input.path_slug !== "string" || typeof input.level !== "string" || typeof input.position !== "number") return null;
  return { path_slug: input.path_slug, level: input.level, position: input.position, unit: u, previous: Array.isArray(input.previous) ? (input.previous as string[]) : [] };
}

export const choiceSchema = z.object({
  video_id: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
  reason_ar: z.string().min(3).max(400),
});

export const timelineSchema = z.object({
  summary_en: z.string().min(10).max(2000),
  duration_sec: z.number().int().min(30).max(3600),
  segments: z
    .array(
      z.object({
        start_sec: z.number().int().min(0),
        end_sec: z.number().int().min(1),
        what_happens_en: z.string().min(3).max(400),
        key_sentences: z.array(z.string().min(1).max(200)).max(6),
      }),
    )
    .min(2)
    .max(40),
  words: z.array(z.string().min(1).max(60)).max(40),
  suitable: z.boolean(),
  concerns_ar: z.string().max(400).optional(),
});
export type Timeline = z.infer<typeof timelineSchema>;

export function searchQueries(unit: PlanUnit, level: string): string[] {
  const base = unit.search_hints.slice(0, 3);
  return base.length ? base.map((h) => (/(english|esl|lesson)/i.test(h) ? h : `${h} English lesson ${level}`)) : [`${unit.title_en} English lesson for beginners`];
}

export function chooseVideoPrompt(input: BuildUnitInput, candidates: VideoCandidate[]): string {
  return `Choose the ONE best teaching video for this unit of the «${input.path_slug}» path, level ${input.level}.
Unit: ${input.unit.code} «${input.unit.title_en}» — situation: ${input.unit.situation_ar}
Grammar: ${input.unit.grammar}. Words: ${input.unit.vocab_domain}. Objectives: ${input.unit.objectives_ar.join(" / ")}.
Prefer: clear speech at this level, 3–12 minutes, a well-known educational channel, English captions, nothing unsuitable for
Yemeni secondary students.
Candidates:
${candidates.map((c) => `- id ${c.id}: «${c.title}» by ${c.channel}, ${Math.round(c.durationSec / 60)} min, captions: ${c.captions ? "yes" : "no"}, views ${c.views}. ${c.description.replace(/\s+/g, " ").slice(0, 160)}`).join("\n")}
Return JSON: {"video_id": "<one id from the list>", "reason_ar": "<why, in Arabic, one sentence>"}`;
}

export function watchPrompt(input: BuildUnitInput): string {
  return `Watch this video carefully. It will be the core of the unit «${input.unit.title_en}» (level ${input.level}).
Write its timeline: split it into segments (30–90 seconds each) with what happens and the key English sentences said
(exactly as spoken). List the English words a beginner would need. Say if it is suitable for Yemeni secondary students
(no romance, alcohol, immodest images, violence, mocking religion); if not, set "suitable": false and explain in Arabic.
Return JSON: {"summary_en": "...", "duration_sec": 0, "segments": [{"start_sec": 0, "end_sec": 0, "what_happens_en": "...",
"key_sentences": ["..."]}], "words": ["..."], "suitable": true, "concerns_ar": ""}`;
}

export function buildUnitPrompt(input: BuildUnitInput, video: { id: string; title: string; channel: string; channelUrl?: string }, timeline: Timeline, schema: string, example: string): string {
  return `Write the complete unit package for Raved.
Path "${input.path_slug}", level "${input.level}", position ${input.position}, code "${input.unit.code}".
Unit plan: ${JSON.stringify(input.unit)}
Units before it (build on them, do not repeat): ${input.previous.join(" | ") || "none"}.

The unit is built around ONE YouTube video, which every lesson uses:
video id ${video.id}, «${video.title}» by ${video.channel}, ${timeline.duration_sec} seconds.
Its timeline:
${timeline.segments.map((s) => `[${s.start_sec}-${s.end_sec}s] ${s.what_happens_en} | ${s.key_sentences.join(" / ")}`).join("\n")}

Rules for this package:
- 4 to 6 lessons. Each lesson covers a part of the video, in order, and follows: a video block for that part
  (type "video", youtube_id "${video.id}", start_sec/end_sec of the part, duration_sec = end-start, optional: true,
  channel "${video.channel}", approx_size_mb, and 2–3 "checkpoints" placed right after moments in that part, relative to
  start_sec, asking in Arabic about what was just said), then a "text" block explaining that part in simple Arabic
  (markdown), then 3–5 "exercise" blocks using the sentences from that part, then one "game" block (games: flashcards,
  match, listen_choose, memory, speed_round, spell_word, swipe_cards, dictation, pronounce).
- The last lesson is a review lesson with a "story" block that retells the video's situation in Hadramout
  (${input.unit.stop_ar}) with Hamza and Reem, in short panels (speaker, text_en, text_ar).
- One lesson has a speaking_task and one a writing_task about the same situation set in ${input.unit.stop_ar}.
- vocab: 8–12 words from the video, with Arabic meanings, IPA and example sentences.
- quiz: 8–10 questions only about what the lessons taught, each with exactly one right answer and an Arabic explanation.
- stop_ar "${input.unit.stop_ar}"; roleplay with a Hadrami character in that place.
- Every id must be unique and stable (e.g. "${input.unit.code}-L1-e1"). version 1.

The JSON schema the package must follow:
${schema}

A short example of a valid package (format only, not content):
${example}

Return only the package JSON.`;
}
