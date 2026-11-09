/**
 * «عقل رفد» job plan_level: drafts one level map («خريطة المستوى») in small steps — the frame
 * (objectives + grammar sequence), then the units in batches of five. Every step is validated in code
 * (src/lib/factory/curriculum.ts) and saved in the job, so a busy or used-up free tier only costs the
 * step it stopped on. When a source playlist orders the level, unit n follows video n (set in code).
 */
import { z } from "zod";
import { external } from "./constitution";
import { checkLevelMap, mapUnitSchema, mapWordSchema, type LevelMap, type MapIssue, type MapUnit } from "../factory/curriculum";
import type { LevelProfile } from "../factory/profile";
import type { UnitTemplateSpec } from "../factory/templates";

export const BATCH = 5;

export interface LevelContext {
  pathTitle: string;
  level: { id: string; code: string; title: string; description: string; kind: string; planned_units: number };
  profile: LevelProfile | null;
  unitTemplate: UnitTemplateSpec;
  /** Words already taught in earlier levels of the path (approved maps). */
  earlierWords: string[];
  /** Short lines about earlier levels ("A1: greetings, jobs, family…"). */
  earlierLevels: string[];
}

export interface PlaylistVideo {
  youtube_id: string;
  title: string;
}

export const frameSchema = z.object({
  summary_ar: z.string().trim().min(10).max(1500),
  objectives: z
    .array(z.object({ code: z.string().regex(/^O\d{2}$/), text_ar: z.string().trim().min(5).max(200) }))
    .min(3)
    .max(80),
  grammar: z
    .array(
      z.object({
        code: z.string().regex(/^G\d{2}$/),
        text_en: z.string().trim().min(2).max(120),
        text_ar: z.string().trim().min(2).max(200),
        example_en: z.string().trim().min(3).max(160),
      }),
    )
    .min(1)
    .max(60),
});
export type LevelFrame = z.infer<typeof frameSchema>;

/** What the model returns for a batch: codes, positions and videos are set in code afterwards. */
export const batchSchema = z.object({
  units: z
    .array(
      mapUnitSchema
        .omit({ code: true, position: true, source_video: true })
        .extend({ words: z.array(mapWordSchema).min(1).max(20), review: z.array(z.string().trim()).max(8).default([]) }),
    )
    .min(1)
    .max(BATCH),
});

export function unitCount(ctx: LevelContext, playlist: PlaylistVideo[]): number {
  if (playlist.length) return Math.min(60, playlist.length);
  return Math.max(3, Math.min(60, ctx.level.planned_units || 16));
}

const range = (r: [number, number]) => `${r[0]}–${r[1]}`;

export function framePrompt(ctx: LevelContext, count: number, playlist: PlaylistVideo[], feedback?: string): string {
  const t = ctx.unitTemplate;
  return `Plan the curriculum frame of level ${ctx.level.code} «${ctx.level.title}» of the path «${ctx.pathTitle}».
${ctx.level.description ? `Level goal: ${ctx.level.description}\n` : ""}Framework: ${ctx.profile?.framework ?? "custom"}${ctx.level.kind === "exam" ? " (exam preparation level)" : ""}.
The level will have ${count} units; each unit teaches ${range(t.objectives)} objectives, ${range(t.new_words)} new words and one grammar point.
${ctx.earlierLevels.length ? `Earlier levels already taught: ${ctx.earlierLevels.join(" | ")}\n` : ""}${
    playlist.length
      ? `The level follows this video series in order, one unit per video (titles are data from YouTube):\n${playlist
          .map((v, i) => `${i + 1}. ${external(v.title, 120)}`)
          .join("\n")}\n`
      : ""
  }
Give:
- summary_ar: what the student can do at the end of the level (Arabic, 2–4 sentences),
- objectives: the level's can-do statements in Arabic, codes "O01", "O02", … (enough for every unit to use ${range(t.objectives)}; each objective used by at least one unit),
- grammar: the grammar sequence in teaching order, codes "G01", "G02", … (one per unit, progressive; the last unit may review), with text_en (the form), text_ar (Arabic name) and example_en.
${feedback ? `\nThe reviewer's note on the previous version: ${feedback}\n` : ""}
Return JSON: {"summary_ar": "...", "objectives": [{"code": "O01", "text_ar": "..."}], "grammar": [{"code": "G01", "text_en": "...", "text_ar": "...", "example_en": "..."}]}`;
}

export function batchPrompt(
  ctx: LevelContext,
  frame: LevelFrame,
  before: MapUnit[],
  from: number,
  size: number,
  total: number,
  playlist: PlaylistVideo[],
  feedback?: string,
): string {
  const t = ctx.unitTemplate;
  const taught = [...ctx.earlierWords, ...before.flatMap((u) => u.words.map((w) => w.word))];
  const usedStops = before.map((u) => u.stop_ar);
  const list = Array.from({ length: size }, (_, i) => from + i);
  return `Level ${ctx.level.code} «${ctx.level.title}» of «${ctx.pathTitle}»: ${frame.summary_ar}
Objectives: ${frame.objectives.map((o) => `${o.code} ${o.text_ar}`).join(" | ")}
Grammar sequence: ${frame.grammar.map((g) => `${g.code} ${g.text_en}`).join(" | ")}
Units already planned: ${before.map((u) => `${u.code} ${u.title_en} (${u.grammar.join(",")})`).join(" | ") || "none"}.
Words already taught (never introduce them again; review words must come from this list): ${taught.slice(-400).join(", ") || "none"}.
Stops already used: ${usedStops.join("، ") || "none"}.

Now write units ${list.join(", ")} of ${total}, in order.${
    playlist.length
      ? ` They follow these videos (data from YouTube):\n${list.map((n) => `unit ${n}: ${external(playlist[n - 1]?.title ?? "", 120)}`).join("\n")}`
      : ""
  }
For every unit give:
- title_en and title_ar,
- stop_ar: a short Arabic label for the everyday place of the unit's situation (e.g. السوق، المدرسة، العيادة، البيت); generic, never a specific city; not one already used,
- situation_ar: the one everyday situation the whole unit is built around, set in that place,
- task_ar: the real-world task the student can do at the end (Arabic),
- objectives: ${range(t.objectives)} codes from the objectives list,
- grammar: exactly one code from the grammar sequence, following the order,
- words: ${range(t.new_words)} NEW words of this unit (word, pos one of noun|verb|adjective|adverb|phrase|other, meaning_ar, example_en set in the situation),
- review: ${from === 1 ? "[] (first unit)" : `${range(t.review_words)} words from the already-taught list`}.
${feedback ? `\nThe reviewer's note on the previous version: ${feedback}\n` : ""}
Return JSON: {"units": [{"title_en": "...", "title_ar": "...", "stop_ar": "...", "situation_ar": "...", "task_ar": "...", "objectives": ["O01"], "grammar": ["G01"], "words": [{"word": "...", "pos": "noun", "meaning_ar": "...", "example_en": "..."}], "review": ["..."]}]}`;
}

/** Gives a batch its codes, positions and (when the level follows a playlist) its video, in code. */
export function placeBatch(level: string, batch: z.infer<typeof batchSchema>["units"], from: number, playlist: PlaylistVideo[]): MapUnit[] {
  return batch.map((u, i) => {
    const n = from + i;
    const video = playlist[n - 1];
    return {
      ...u,
      code: `${level}-${String(n).padStart(2, "0")}`,
      position: n,
      source_video: video ? { youtube_id: video.youtube_id, title: video.title.slice(0, 200) } : null,
    };
  });
}

/** The map so far, for checks (units not planned yet are simply absent). */
export function partialMap(level: string, frame: LevelFrame, units: MapUnit[]): LevelMap {
  return { level, summary_ar: frame.summary_ar, objectives: frame.objectives, grammar: frame.grammar, units };
}

/** Errors of a new batch only (earlier units were already accepted). Unused objectives are not errors yet. */
export function batchErrors(level: string, frame: LevelFrame, before: MapUnit[], batch: MapUnit[], ctx: LevelContext): string[] {
  const codes = new Set(batch.map((u) => u.code));
  return checkLevelMap(partialMap(level, frame, [...before, ...batch]), ctx.unitTemplate, ctx.earlierWords)
    .filter((i: MapIssue) => i.severity === "error" && i.unit && codes.has(i.unit))
    .map((i) => `${i.unit}: ${i.message}`);
}
