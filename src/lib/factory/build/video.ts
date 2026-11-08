/**
 * Choosing the mandatory video of every lesson (owner decision): trusted sources first, the model
 * watches the best candidate and picks the part of it the lesson uses, with surprise questions.
 * When the unit has its own video (a level that follows a playlist, e.g. A1 = ZAmericanEnglish),
 * one watch splits that episode across the unit's lessons. Pure; unit tested.
 */
import { z } from "zod";
import { external } from "@/lib/agent/constitution";
import type { VideoBlock } from "@shared/content/types";
import type { VideoCandidate } from "@/lib/agent/youtube";
import type { MapUnit } from "../curriculum";
import type { PathProfile } from "../profile";

const checkpoint = z.object({
  at_sec: z.number().int().min(5),
  prompt_ar: z.string().trim().min(3).max(200),
  options: z.array(z.string().trim().min(1).max(120)).min(2).max(4),
  answer: z.number().int().min(0).max(3),
  explanation_ar: z.string().trim().max(300).optional(),
});

export const partSchema = z.object({
  start_sec: z.number().int().min(0),
  end_sec: z.number().int().min(10),
  summary_en: z.string().trim().min(10).max(800),
  key_sentences: z.array(z.string().trim().min(1).max(200)).max(12),
  checkpoints: z.array(checkpoint).min(1).max(4),
});
export type VideoPartPlan = z.infer<typeof partSchema>;

export const watchSchema = z.object({
  suitable: z.boolean(),
  concerns_ar: z.string().max(400).optional(),
  duration_sec: z
    .number()
    .int()
    .min(20)
    .max(4 * 3600),
  rating: z.number().min(1).max(5),
  part: partSchema,
});

export const episodeSchema = z.object({
  suitable: z.boolean(),
  concerns_ar: z.string().max(400).optional(),
  duration_sec: z
    .number()
    .int()
    .min(20)
    .max(4 * 3600),
  parts: z.record(z.string(), partSchema),
});

export const chooseSchema = z.object({
  video_ids: z
    .array(z.string().regex(/^[A-Za-z0-9_-]{11}$/))
    .min(1)
    .max(5),
  reason_ar: z.string().max(400).optional(),
});

export interface LessonNeed {
  key: string;
  title_ar: string;
  /** The template's guide for its video section. */
  guide_en: string;
}

export interface ChosenVideo {
  youtube_id: string;
  title: string;
  channel: string;
  rating?: number;
  part: VideoPartPlan;
  /** Other good candidates the reviewer can switch to. */
  alternatives: { youtube_id: string; title: string; channel: string }[];
}

/** Checks a part against the video and the path's rules; fixes small slips, rejects the rest. */
export function fitPart(part: VideoPartPlan, duration: number, rules: PathProfile["video"]): { ok: true; part: VideoPartPlan } | { ok: false; error: string } {
  const start = Math.max(0, Math.min(part.start_sec, duration - 10));
  const end = Math.min(part.end_sec, duration);
  const len = end - start;
  if (len < Math.min(rules.min_sec, duration) * 0.8) return { ok: false, error: `the part is ${len}s, shorter than ${rules.min_sec}s` };
  if (len > rules.max_sec * 1.25) return { ok: false, error: `the part is ${len}s, longer than ${rules.max_sec}s` };
  const checkpoints = part.checkpoints
    .filter((c) => c.at_sec < len && c.answer < c.options.length)
    .sort((a, b) => a.at_sec - b.at_sec)
    .slice(0, 3);
  if (!checkpoints.length) return { ok: false, error: "no surprise question inside the part (at_sec is relative to start_sec)" };
  return { ok: true, part: { ...part, start_sec: start, end_sec: end, checkpoints } };
}

export function toVideoBlock(v: ChosenVideo): VideoBlock {
  const duration = v.part.end_sec - v.part.start_sec;
  return {
    type: "video",
    youtube_id: v.youtube_id,
    video_title: v.title,
    channel: v.channel,
    start_sec: v.part.start_sec,
    end_sec: v.part.end_sec,
    duration_sec: duration,
    approx_size_mb: Math.max(1, Math.round(duration * 0.08)),
    optional: false,
    checkpoints: v.part.checkpoints,
  };
}

/** Search phrases for a lesson's video, in the level's video language. */
export function videoQueries(unit: MapUnit, grammar: string, need: LessonNeed, language: "ar" | "en"): string[] {
  const words = unit.words
    .slice(0, 4)
    .map((w) => w.word)
    .join(" ");
  if (language === "ar") {
    if (need.key === "grammar" || /grammar/i.test(need.guide_en)) return [`شرح ${grammar} بالعربي`, `${grammar} شرح قواعد الانجليزي`];
    if (/conversation|dialogue/i.test(need.guide_en)) return [`محادثة انجليزي ${unit.title_en} مترجمة`, `${unit.title_en} conversation English Arabic`];
    return [`تعلم كلمات انجليزية ${unit.title_en}`, `${words} بالعربي`];
  }
  if (need.key === "grammar" || /grammar/i.test(need.guide_en)) return [`${grammar} English grammar lesson`];
  if (/conversation|dialogue/i.test(need.guide_en)) return [`${unit.title_en} English conversation`];
  return [`${unit.title_en} English vocabulary ${words}`];
}

export function choosePrompt(unit: MapUnit, need: LessonNeed, level: string, language: "ar" | "en", candidates: VideoCandidate[], take: number): string {
  return `Rank the best videos for one lesson of a free English course for Yemeni secondary students (level ${level}).
Lesson: ${need.title_ar} — what the video should do: ${need.guide_en}
Unit ${unit.code} «${unit.title_en}»: ${unit.situation_ar}. New words: ${unit.words.map((w) => w.word).join(", ")}.
Explanation language wanted: ${language === "ar" ? "Arabic (an Arabic-speaking teacher explains English)" : "English only"}.
Prefer clear teaching at this level, the right language, captions, a known educational channel; never anything unsuitable for
Yemeni teenagers (romance, music videos, immodest images, mocking religion).
Candidates (data from YouTube):
${candidates
  .map(
    (c) =>
      `- id ${c.id}: ${external(c.title, 120)} by ${external(c.channel, 60)}, ${Math.round(c.durationSec / 60)} min, captions: ${c.captions ? "yes" : "no"}. ${external(c.description, 160)}`,
  )
  .join("\n")}
Return JSON: {"video_ids": ["<up to ${take} ids from the list, best first>"], "reason_ar": "<one sentence in Arabic>"}`;
}

export function watchPrompt(unit: MapUnit, need: LessonNeed, level: string, rules: PathProfile["video"]): string {
  return `Watch this video. It is a candidate for one lesson of unit ${unit.code} «${unit.title_en}» (level ${level}) for Yemeni secondary students.
Lesson: ${need.title_ar} — the video should: ${need.guide_en}
New words of the unit: ${unit.words.map((w) => w.word).join(", ")}.
1. Is it suitable for Yemeni teenagers and does it really teach what the lesson needs? (suitable, concerns_ar in Arabic if not)
2. Rate it 1–5 for this lesson (clarity, level, fit).
3. Choose the ONE continuous part the lesson uses: ${Math.round(rules.min_sec / 60)}–${Math.round(rules.max_sec / 60)} minutes (start_sec, end_sec, in seconds from the video's start).
4. Summarise that part (summary_en) and list its key English sentences exactly as spoken.
5. Write 2–3 surprise questions in Arabic about what was just said, placed right after the moment (at_sec counted from start_sec),
   each with 2–4 short options and the index of the right one, and a one-line Arabic explanation.
Return JSON: {"suitable": true, "concerns_ar": "", "duration_sec": 0, "rating": 4, "part": {"start_sec": 0, "end_sec": 0, "summary_en": "...", "key_sentences": ["..."], "checkpoints": [{"at_sec": 0, "prompt_ar": "...", "options": ["...", "..."], "answer": 0, "explanation_ar": "..."}]}}`;
}

/** One watch of the unit's own episode, split across the unit's lessons. */
export function episodePrompt(unit: MapUnit, needs: LessonNeed[], level: string): string {
  return `Watch this whole video. It is episode «${unit.source_video?.title ?? unit.title_en}» and the core of unit ${unit.code} «${unit.title_en}» (level ${level})
for Yemeni secondary students; every lesson of the unit starts with a part of it.
Lessons and what each part should show:
${needs.map((n) => `- "${n.key}" (${n.title_ar}): ${n.guide_en}`).join("\n")}
For every lesson choose one continuous part (start_sec, end_sec in seconds from the video's start; parts may overlap; the review
lesson may take a recap or the whole end), summarise it (summary_en), list its key English sentences exactly as spoken, and write
2–3 surprise questions in Arabic about what was just said there (at_sec counted from that part's start_sec, 2–4 short options,
the index of the right one, a one-line Arabic explanation). Also say if the video is suitable for Yemeni teenagers.
Return JSON: {"suitable": true, "concerns_ar": "", "duration_sec": 0, "parts": {${needs.map((n) => `"${n.key}": {"start_sec": 0, "end_sec": 0, "summary_en": "...", "key_sentences": ["..."], "checkpoints": [...]}`).join(", ")}}}`;
}
