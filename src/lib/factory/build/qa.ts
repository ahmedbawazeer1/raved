/**
 * Quality gates of a built unit, before any person sees it.
 * Gate 1 (code, free): the package is valid, every lesson has its video, every new word is used,
 * the quiz is complete, the English stays within the words the student knows, nothing unsuitable.
 * Gate 2 (a second model call, the critic): scores every lesson on the path's quality criteria;
 * a lesson under the minimum is rewritten once with the critic's notes. Pure parts; unit tested.
 */
import { z } from "zod";
import type { UnitPackage } from "@shared/content/types";
import type { WordItem } from "./generate";

export interface QaIssue {
  severity: "error" | "warn";
  lesson?: number;
  message: string;
}

/** Very common English words a beginner meets everywhere (not counted as "above the level"). */
const COMMON = new Set(
  `a an the and or but so if because to of in on at for from with without by about as into up down out over under after before
  i me my mine you your yours he him his she her hers it its we us our they them their this that these those here there
  am is are was were be been being have has had do does did can could will would shall should may might must
  not no yes ok okay hello hi bye goodbye please thank thanks sorry welcome what who whom whose which where when why how
  all some any many much more most few little very too also only just then now today tomorrow yesterday again still
  one two three four five six seven eight nine ten first second third next last other another each every
  good bad big small new old young nice happy sad fine great right wrong
  go goes went come comes came get gets got make makes made take takes took see sees saw say says said tell tells told
  know knows like likes want wants need needs look looks give gives live lives work works play plays read reads write
  writes speak speaks listen listens eat eats drink drinks sleep sleeps help helps let lets call calls name names
  mr mrs miss ms man men woman women boy boys girl girls friend friends teacher teachers student students school family
  day days time year years morning evening night home house city town street market
  let's i'm you're he's she's it's we're they're isn't aren't don't doesn't can't i've what's that's there's`
    .split(/\s+/)
    .filter(Boolean),
);

const BANNED = /\b(alcohol|beer|wine|whisky|vodka|pork|bacon|casino|gambl\w*|bet(ting)?|girlfriend|boyfriend|kiss\w*|dating|date night|nightclub|bikini|sexy)\b/i;
const ARABIC = /[؀-ۿ]/;

const englishTokens = (s: string) => s.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) ?? [];

/** Strips simple endings so "markets", "worked", "working" count as the taught word. */
function stem(w: string): string[] {
  const out = [w];
  for (const end of ["'s", "s", "es", "ed", "d", "ing", "ly", "er", "est"]) if (w.endsWith(end) && w.length - end.length >= 2) out.push(w.slice(0, -end.length));
  if (w.endsWith("ies")) out.push(`${w.slice(0, -3)}y`);
  return out;
}

export interface QaInput {
  pkg: UnitPackage;
  words: WordItem[];
  /** Every word taught up to and including this unit (map words of this level up to here + earlier levels). */
  known: Iterable<string>;
  quizMin: number;
  /** Lesson-level validation from content/schema (validateUnitPackage). */
  schemaErrors: { path: string; message: string }[];
}

export function gateOne({ pkg, words, known, quizMin, schemaErrors }: QaInput): QaIssue[] {
  const issues: QaIssue[] = schemaErrors.slice(0, 10).map((e) => ({ severity: "error" as const, message: `بنية الوحدة: ${e.path} ${e.message}` }));
  const knownSet = new Set<string>([...COMMON]);
  for (const k of known) for (const t of englishTokens(k)) knownSet.add(t);
  for (const w of words) for (const t of englishTokens(w.word)) knownSet.add(t);
  const isKnown = (t: string) => stem(t).some((s) => knownSet.has(s));

  const allText: string[] = [];
  pkg.lessons.forEach((l) => {
    const videos = l.blocks.filter((b) => b.type === "video" && "youtube_id" in b && b.youtube_id);
    if (videos.length !== 1) issues.push({ severity: "error", lesson: l.position, message: "كل درس يحتاج فيديو واحداً بالضبط" });
    const english: string[] = [];
    for (const b of l.blocks) {
      if (b.type === "text" && b.markdown_ar && !ARABIC.test(b.markdown_ar)) issues.push({ severity: "error", lesson: l.position, message: "الشرح ليس بالعربية" });
      if (b.type === "audio" && b.text_en) english.push(b.text_en);
      if (b.type === "reading" && b.text_en) english.push(b.text_en);
      if (b.type === "story") english.push(...(b.panels ?? []).map((p) => p.text_en));
      if (b.type === "table") english.push(...(b.rows ?? []).flat().filter((c) => !ARABIC.test(c)));
      if (b.type === "exercise" && b.exercise) allText.push(b.exercise.prompt);
      if (b.type === "text" && b.markdown_ar) allText.push(b.markdown_ar);
    }
    allText.push(...english);
    const unknown = [...new Set(english.flatMap(englishTokens).filter((t) => !isKnown(t)))];
    if (unknown.length > 6)
      issues.push({ severity: "warn", lesson: l.position, message: `كلمات إنجليزية خارج ما تعلّمه الطالب (${unknown.length}): ${unknown.slice(0, 12).join("، ")}` });
    const bad = [...english, ...l.blocks.flatMap((b) => (b.type === "text" && b.markdown_ar ? [b.markdown_ar] : []))].join(" \n ").match(BANNED);
    if (bad) issues.push({ severity: "error", lesson: l.position, message: `محتوى غير مناسب: «${bad[0]}»` });
  });

  const joined = allText.join(" \n ").toLowerCase();
  const unused = words.filter((w) => !w.review && !englishTokens(w.word).every((t) => stem(t).some((s) => joined.includes(s))));
  if (unused.length) issues.push({ severity: "warn", message: `كلمات جديدة لا تظهر في الدروس: ${unused.map((w) => w.word).join("، ")}` });
  if (pkg.quiz.questions.length < quizMin) issues.push({ severity: "error", message: `أسئلة الاختبار ${pkg.quiz.questions.length} فقط، والمطلوب ${quizMin} على الأقل` });
  return issues;
}

// ---------------------------------------------------------------------------------------------
// Gate 2: the critic
// ---------------------------------------------------------------------------------------------

export const critiqueSchema = z.object({
  lessons: z
    .array(
      z.object({
        position: z.number().int().min(1).max(12),
        scores: z.array(z.number().min(1).max(5)).min(1).max(10),
        problems: z.array(z.object({ section: z.string().max(40), problem_ar: z.string().trim().min(3).max(400) })).max(8),
      }),
    )
    .min(1)
    .max(12),
  unit_notes_ar: z.string().max(800).optional(),
});
export type Critique = z.infer<typeof critiqueSchema>;

/** A compact, readable view of a lesson for the critic (no ids, no answers hidden). */
export function lessonDigest(l: UnitPackage["lessons"][number]): string {
  const parts = l.blocks.map((b) => {
    if (b.type === "video") return `[video ${b.video_title ?? ""} ${b.start_sec ?? 0}-${b.end_sec ?? ""}s; questions: ${(b.checkpoints ?? []).map((c) => c.prompt_ar).join(" / ")}]`;
    if (b.type === "text") return `[text] ${b.markdown_ar ?? ""}`;
    if (b.type === "audio") return `[audio] ${b.text_en ?? ""}`;
    if (b.type === "reading") return `[reading] ${b.text_en ?? ""}`;
    if (b.type === "table") return `[table] ${(b.headers ?? []).join(" | ")}\n${(b.rows ?? []).map((r) => r.join(" | ")).join("\n")}`;
    if (b.type === "story") return `[dialogue ${b.title_ar ?? ""}] ${(b.panels ?? []).map((p) => `${p.speaker}: ${p.text_en} (${p.text_ar})`).join(" / ")}`;
    if (b.type === "exercise" && b.exercise)
      return `[exercise ${b.exercise.kind}] ${b.exercise.prompt} ${b.exercise.options ? `(${b.exercise.options.join(" / ")})` : ""} → ${JSON.stringify(b.exercise.answer)}`;
    if (b.type === "game") return `[game ${b.game}]`;
    return `[${b.type}]`;
  });
  if (l.speaking_task) parts.push(`[speaking task] ${l.speaking_task.prompt_en}`);
  if (l.writing_task) parts.push(`[writing task] ${l.writing_task.prompt_en}`);
  return `Lesson ${l.position} «${l.title}» (${l.skill}):\n${parts.join("\n")}`;
}

export function critiquePrompt(pkg: UnitPackage, level: string, criteria: string[], objectives: string[]): string {
  return `You are a strict reviewer of a free English course for Yemeni secondary students. Review unit ${pkg.code} «${pkg.title}» (level ${level}).
Objectives: ${objectives.join(" | ")}. Grammar point: ${pkg.grammar_point}. New words: ${pkg.vocab.map((v) => v.word).join(", ")}.
Score EVERY lesson 1–5 on each criterion, in this order:
${criteria.map((c, i) => `${i + 1}. ${c}`).join("\n")}
List concrete problems (which section, what is wrong, in Arabic) — wrong English, Arabic that is unclear, content above the level,
anything unsuitable for Yemeni teenagers, exercises that do not match what was taught, a video part that does not serve the lesson.
Do not invent problems; an excellent lesson has none.

${pkg.lessons.map(lessonDigest).join("\n\n")}

Return JSON: {"lessons": [{"position": 1, "scores": [${criteria.map(() => "5").join(", ")}], "problems": [{"section": "...", "problem_ar": "..."}]}], "unit_notes_ar": "..."}`;
}

/** Lessons whose lowest score is under the minimum (to rewrite once with the critic's notes). */
export function failingLessons(c: Critique, min: number): Critique["lessons"] {
  return c.lessons.filter((l) => Math.min(...l.scores) < min);
}

export function critiqueNote(l: Critique["lessons"][number]): string {
  return l.problems.map((p) => `${p.section}: ${p.problem_ar}`).join(" | ");
}
