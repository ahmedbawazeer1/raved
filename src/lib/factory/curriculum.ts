/**
 * The level map («خريطة المستوى»): the curriculum of one level, planned once before any unit is built —
 * can-do objectives, the grammar sequence, and every unit with its situation, real-world task, new words
 * and review words. «عقل رفد» drafts it in small steps, the teacher reviews it, the owner approves it.
 * Then the factory builds the units one by one from it. The checks here run in code (free, instant)
 * and are shown in the studio. Unit tested.
 */
import { z } from "zod";
import type { UnitTemplateSpec } from "./templates";

export const UNIT_CODE = /^[A-Z0-9]{1,10}-\d{2}$/;
export const WORD = /^[A-Za-z][A-Za-z' .-]{0,39}$/;
export const POS = ["noun", "verb", "adjective", "adverb", "phrase", "other"] as const;

export const mapWordSchema = z.object({
  word: z.string().trim().regex(WORD, "كلمة إنجليزية فقط"),
  pos: z.enum(POS),
  meaning_ar: z.string().trim().min(1).max(80),
  example_en: z.string().trim().min(3).max(160),
});

export const mapUnitSchema = z.object({
  code: z.string().regex(UNIT_CODE),
  position: z.number().int().min(1).max(60),
  title_en: z.string().trim().min(2).max(80),
  title_ar: z.string().trim().min(2).max(80),
  stop_ar: z.string().trim().min(2).max(40),
  situation_ar: z.string().trim().min(5).max(300),
  task_ar: z.string().trim().min(5).max(300),
  objectives: z.array(z.string()).min(1).max(6),
  grammar: z.array(z.string()).max(2),
  words: z.array(mapWordSchema).min(1).max(20),
  review: z.array(z.string().trim().regex(WORD)).max(8),
  source_video: z
    .object({ youtube_id: z.string().regex(/^[A-Za-z0-9_-]{11}$/), title: z.string().max(200) })
    .nullable()
    .optional(),
});

export const levelMapSchema = z.object({
  level: z.string().min(1).max(10),
  summary_ar: z.string().trim().min(10).max(1500),
  objectives: z
    .array(z.object({ code: z.string().regex(/^O\d{2}$/), text_ar: z.string().trim().min(5).max(200) }))
    .min(1)
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
    .max(60),
  units: z.array(mapUnitSchema).min(1).max(60),
});

export type MapWord = z.infer<typeof mapWordSchema>;
export type MapUnit = z.infer<typeof mapUnitSchema>;
export type LevelMap = z.infer<typeof levelMapSchema>;

export interface MapIssue {
  severity: "error" | "warn";
  unit?: string;
  message: string;
}

const norm = (w: string) => w.trim().toLowerCase();

/**
 * The automatic checks of a level map against its unit template. Errors block approval; warnings are
 * shown to the teacher. `earlier` = words taught in earlier levels of the path.
 */
export function checkLevelMap(map: LevelMap, unit: UnitTemplateSpec, earlier: Iterable<string> = []): MapIssue[] {
  const issues: MapIssue[] = [];
  const objectiveCodes = new Set(map.objectives.map((o) => o.code));
  const grammarCodes = new Set(map.grammar.map((g) => g.code));
  const usedObjectives = new Set<string>();
  const usedGrammar = new Set<string>();
  const taught = new Map<string, string>(); // word → unit that introduced it
  for (const w of earlier) taught.set(norm(w), "مستوى سابق");
  const stops = new Map<string, string>();
  const [oMin, oMax] = unit.objectives;
  const [wMin, wMax] = unit.new_words;
  const [rMin, rMax] = unit.review_words;

  const units = [...map.units].sort((a, b) => a.position - b.position);
  units.forEach((u, i) => {
    const expected = `${map.level}-${String(i + 1).padStart(2, "0")}`;
    if (u.code !== expected || u.position !== i + 1) issues.push({ severity: "error", unit: u.code, message: `الرمز والترتيب يجب أن يكونا ${expected}` });
    if (u.objectives.length < oMin || u.objectives.length > oMax)
      issues.push({ severity: "error", unit: u.code, message: `عدد الأهداف ${u.objectives.length}، والمطلوب ${oMin}–${oMax}` });
    for (const o of u.objectives) {
      if (!objectiveCodes.has(o)) issues.push({ severity: "error", unit: u.code, message: `هدف غير موجود: ${o}` });
      usedObjectives.add(o);
    }
    if (u.grammar.length !== 1) issues.push({ severity: i === units.length - 1 ? "warn" : "error", unit: u.code, message: "كل وحدة لها قاعدة واحدة" });
    for (const g of u.grammar) {
      if (!grammarCodes.has(g)) issues.push({ severity: "error", unit: u.code, message: `قاعدة غير موجودة: ${g}` });
      usedGrammar.add(g);
    }
    if (u.words.length < wMin || u.words.length > wMax)
      issues.push({ severity: "error", unit: u.code, message: `عدد الكلمات الجديدة ${u.words.length}، والمطلوب ${wMin}–${wMax}` });
    const inUnit = new Set<string>();
    for (const w of u.words) {
      const key = norm(w.word);
      if (inUnit.has(key)) issues.push({ severity: "error", unit: u.code, message: `«${w.word}» مكررة في الوحدة` });
      else if (taught.has(key)) issues.push({ severity: "error", unit: u.code, message: `«${w.word}» دُرّست قبل ذلك في ${taught.get(key)}` });
      inUnit.add(key);
    }
    if (i > 0 && (u.review.length < rMin || u.review.length > rMax))
      issues.push({ severity: "warn", unit: u.code, message: `كلمات المراجعة ${u.review.length}، والمطلوب ${rMin}–${rMax}` });
    for (const r of u.review) {
      if (!taught.has(norm(r))) issues.push({ severity: "error", unit: u.code, message: `كلمة المراجعة «${r}» لم تُدرّس قبل هذه الوحدة` });
    }
    for (const w of u.words) if (!taught.has(norm(w.word))) taught.set(norm(w.word), u.code);
    const stop = u.stop_ar.trim();
    if (stops.has(stop)) issues.push({ severity: "warn", unit: u.code, message: `المحطة «${stop}» تكررت مع ${stops.get(stop)}` });
    else stops.set(stop, u.code);
  });

  for (const o of map.objectives) if (!usedObjectives.has(o.code)) issues.push({ severity: "warn", message: `الهدف ${o.code} لا تعلّمه أي وحدة` });
  for (const g of map.grammar) if (!usedGrammar.has(g.code)) issues.push({ severity: "warn", message: `القاعدة ${g.code} لا تعلّمها أي وحدة` });
  return issues;
}

export function blocking(issues: MapIssue[]): boolean {
  return issues.some((i) => i.severity === "error");
}

/** A stable item code for a word inside a level (e.g. "w-good-morning"). */
export function wordCode(word: string): string {
  return `w-${norm(word)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}`.slice(0, 40);
}
