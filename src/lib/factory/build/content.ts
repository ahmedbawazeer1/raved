/**
 * What the model (or a teacher) writes for a lesson: one object per text section of the lesson
 * template, typed by the section's block. Exercises, games and the video are not written here.
 * Unit tested.
 */
import { z } from "zod";
import { external } from "@/lib/agent/constitution";
import type { MapUnit } from "../curriculum";
import type { LessonTemplateSpec, TemplateSection } from "../templates";
import type { WordItem } from "./generate";

const panel = z.object({ speaker: z.string().trim().min(1).max(40), text_en: z.string().trim().min(1).max(220), text_ar: z.string().trim().min(1).max(260) });

export const CONTENT_SCHEMAS = {
  text: z.object({ block: z.literal("text"), markdown_ar: z.string().trim().min(20).max(4000) }),
  table: z.object({
    block: z.literal("table"),
    headers: z.array(z.string().trim().min(1).max(60)).min(2).max(5),
    rows: z.array(z.array(z.string().trim().max(220)).min(2).max(5)).min(1).max(20),
  }),
  audio: z.object({ block: z.literal("audio"), sentences_en: z.array(z.string().trim().min(2).max(220)).min(2).max(14) }),
  reading: z.object({ block: z.literal("reading"), text_en: z.string().trim().min(40).max(2500) }),
  story: z.object({ block: z.literal("story"), title_ar: z.string().trim().max(80).default(""), panels: z.array(panel).min(3).max(16) }),
  speaking_task: z.object({
    block: z.literal("speaking_task"),
    prompt_en: z.string().trim().min(10).max(400),
    helpful_phrases: z.array(z.string().trim().min(1).max(80)).max(8).default([]),
    rubric_focus: z.array(z.string().trim().min(1).max(60)).max(4).default([]),
  }),
  writing_task: z.object({
    block: z.literal("writing_task"),
    prompt_en: z.string().trim().min(10).max(400),
    min_words: z.number().int().min(5).max(300).default(20),
    max_words: z.number().int().min(10).max(500).default(60),
    rubric_focus: z.array(z.string().trim().min(1).max(60)).max(4).default([]),
  }),
} as const;

export type WrittenBlock = keyof typeof CONTENT_SCHEMAS;
export type SectionContent = { [K in WrittenBlock]: z.infer<(typeof CONTENT_SCHEMAS)[K]> }[WrittenBlock];

/** Sections the model writes (text sections; not the video, exercises or games). */
export function writtenSections(t: LessonTemplateSpec): (TemplateSection & { block: WrittenBlock })[] {
  return t.sections.filter((s): s is TemplateSection & { block: WrittenBlock } => s.source === "model" && s.block in CONTENT_SCHEMAS);
}

/** Validates a written lesson against its template; returns the typed sections or the problems. */
export function parseLessonContent(
  t: LessonTemplateSpec,
  raw: unknown,
): { ok: true; title_ar: string; sections: Record<string, SectionContent> } | { ok: false; errors: string[] } {
  const obj = (raw && typeof raw === "object" ? raw : {}) as { title_ar?: unknown; sections?: Record<string, unknown> };
  const errors: string[] = [];
  const title = typeof obj.title_ar === "string" ? obj.title_ar.trim() : "";
  if (title.length < 2 || title.length > 80) errors.push("title_ar: an Arabic lesson title is required");
  const sections: Record<string, SectionContent> = {};
  for (const s of writtenSections(t)) {
    const value = obj.sections?.[s.key];
    const r = CONTENT_SCHEMAS[s.block].safeParse({ ...(value && typeof value === "object" ? value : {}), block: s.block });
    if (r.success) sections[s.key] = r.data as SectionContent;
    else if (!s.optional) errors.push(...r.error.issues.slice(0, 4).map((i) => `sections.${s.key}.${i.path.join(".")}: ${i.message}`));
  }
  return errors.length ? { ok: false, errors } : { ok: true, title_ar: title, sections };
}

const SHAPES: Record<WrittenBlock, string> = {
  text: '{"markdown_ar": "..."}',
  table: '{"headers": ["...", "..."], "rows": [["...", "..."]]}',
  audio: '{"sentences_en": ["...", "..."]}',
  reading: '{"text_en": "..."}',
  story: '{"title_ar": "...", "panels": [{"speaker": "...", "text_en": "...", "text_ar": "..."}]}',
  speaking_task: '{"prompt_en": "...", "helpful_phrases": ["..."], "rubric_focus": ["..."]}',
  writing_task: '{"prompt_en": "...", "min_words": 20, "max_words": 60, "rubric_focus": ["..."]}',
};

export interface LessonPromptInput {
  path: string;
  level: string;
  unit: MapUnit;
  grammar: { text_en: string; text_ar: string; example_en: string }[];
  objectives: string[];
  words: WordItem[];
  lesson: { n: number; total: number; key: string; title_ar: string; template: LessonTemplateSpec };
  /** What is said in the lesson's video part (data from YouTube). */
  video?: { title: string; summary: string; sentences: string[] };
  /** Titles of the lessons already written in this unit (to avoid repeating them). */
  before: string[];
  feedback?: string;
  /** For the last lesson: also write the unit's role-play partner. */
  withRoleplay?: boolean;
}

export function lessonPrompt(p: LessonPromptInput): string {
  const sections = writtenSections(p.lesson.template);
  const newWords = p.words.filter((w) => !w.review);
  const review = p.words.filter((w) => w.review);
  return `Write lesson ${p.lesson.n} of ${p.lesson.total} of unit ${p.unit.code} «${p.unit.title_en}» (path «${p.path}», level ${p.level}).
Lesson type: ${p.lesson.title_ar} (${p.lesson.template.skill}, about ${p.lesson.template.est_minutes} minutes).
The unit's situation: ${p.unit.situation_ar} — stop: ${p.unit.stop_ar}. Real-world task: ${p.unit.task_ar}
Objectives: ${p.objectives.join(" | ")}
Grammar point: ${p.grammar.map((g) => `${g.text_en} (${g.text_ar}), e.g. "${g.example_en}"`).join("; ") || "review"}
New words (use them; nothing above the level): ${newWords.map((w) => `${w.word} = ${w.meaning_ar}`).join(", ")}
Review words from earlier units (use 2–3 of them): ${review.map((w) => w.word).join(", ") || "none"}
${
  p.video
    ? `The lesson starts with a video part the student has just watched — build on what is said there:
title: ${external(p.video.title, 160)}
${external(p.video.summary, 600)}
key sentences: ${external(p.video.sentences.join(" / "), 1200)}
`
    : ""
}${p.before.length ? `Lessons already written in this unit: ${p.before.join(" | ")} — do not repeat their content.\n` : ""}
Write these sections (keys and what each contains):
${sections.map((s) => `- "${s.key}" (${s.title_ar}): ${s.guide_en}\n  shape: ${SHAPES[s.block]}`).join("\n")}
English sentences must be short, correct and at level ${p.level}; Arabic in simple Modern Standard Arabic. Names, places, food and prices from Hadramout.
${p.feedback ? `\nThe reviewer's note on the previous version of this lesson: ${p.feedback}\n` : ""}${
    p.withRoleplay
      ? `\nAlso write "roleplay": the unit's conversation partner — a Hadrami character at ${p.unit.stop_ar} in the unit's situation: {"character_ar": "...", "scenario_en": "You are … (instructions for the AI partner, 1–3 sentences)", "opening_en": "the partner's first line"}.\n`
      : ""
  }
Return JSON: {"title_ar": "<Arabic lesson title>", "sections": {${sections.map((s) => `"${s.key}": ${SHAPES[s.block]}`).join(", ")}}${p.withRoleplay ? ', "roleplay": {...}' : ""}}`;
}

export const roleplaySchema = z.object({
  character_ar: z.string().trim().min(3).max(120),
  scenario_en: z.string().trim().min(20).max(600),
  opening_en: z.string().trim().min(2).max(200),
});

// ---------------------------------------------------------------------------------------------
// Plain-text editing of a section in the review studio (one simple format per block type).
// ---------------------------------------------------------------------------------------------

export const EDIT_HINTS: Record<WrittenBlock, string> = {
  text: "شرح بالعربية (يقبل markdown).",
  table: "سطر لكل صف، والخلايا مفصولة بـ |. السطر الأول عناوين الأعمدة.",
  audio: "جملة إنجليزية في كل سطر (يقرؤها التطبيق بالصوت).",
  reading: "نص القراءة بالإنجليزية.",
  story: "سطر لكل جملة: المتحدث | English | العربية. السطر الأول عنوان الحوار (اختياري، يبدأ بـ #).",
  speaking_task: "السطر الأول: المهمة بالإنجليزية. ثم عبارة مساعدة في كل سطر.",
  writing_task: "السطر الأول: المهمة بالإنجليزية. السطر الثاني: أقل وأكثر عدد كلمات مثل 20-60.",
};

const lines = (t: string) =>
  t
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
const cells = (l: string) => l.split("|").map((c) => c.trim());

export function sectionToText(c: SectionContent): string {
  switch (c.block) {
    case "text":
      return c.markdown_ar;
    case "table":
      return [c.headers, ...c.rows].map((r) => r.join(" | ")).join("\n");
    case "audio":
      return c.sentences_en.join("\n");
    case "reading":
      return c.text_en;
    case "story":
      return [...(c.title_ar ? [`# ${c.title_ar}`] : []), ...c.panels.map((p) => `${p.speaker} | ${p.text_en} | ${p.text_ar}`)].join("\n");
    case "speaking_task":
      return [c.prompt_en, ...c.helpful_phrases].join("\n");
    case "writing_task":
      return [c.prompt_en, `${c.min_words}-${c.max_words}`].join("\n");
  }
}

/** Parses an edited section back; returns Arabic errors when the text does not fit the format. */
export function textToSection(block: WrittenBlock, text: string): { ok: true; value: SectionContent } | { ok: false; error: string } {
  let raw: Record<string, unknown>;
  const ls = lines(text);
  switch (block) {
    case "text":
      raw = { markdown_ar: text.trim() };
      break;
    case "table":
      raw = { headers: ls[0] ? cells(ls[0]) : [], rows: ls.slice(1).map(cells) };
      break;
    case "audio":
      raw = { sentences_en: ls };
      break;
    case "reading":
      raw = { text_en: text.trim() };
      break;
    case "story": {
      const title = ls[0]?.startsWith("#") ? ls[0].replace(/^#+\s*/, "") : "";
      const rows = (title ? ls.slice(1) : ls).map(cells);
      if (rows.some((r) => r.length !== 3)) return { ok: false, error: "كل سطر في الحوار: المتحدث | English | العربية" };
      raw = { title_ar: title, panels: rows.map(([speaker, text_en, text_ar]) => ({ speaker, text_en, text_ar })) };
      break;
    }
    case "speaking_task":
      raw = { prompt_en: ls[0] ?? "", helpful_phrases: ls.slice(1) };
      break;
    case "writing_task": {
      const m = /^(\d+)\s*-\s*(\d+)$/.exec(ls[1] ?? "");
      raw = { prompt_en: ls[0] ?? "", ...(m ? { min_words: Number(m[1]), max_words: Number(m[2]) } : {}) };
      break;
    }
  }
  const r = CONTENT_SCHEMAS[block].safeParse({ ...raw, block });
  return r.success ? { ok: true, value: r.data as SectionContent } : { ok: false, error: `النص لا يطابق الشكل المطلوب: ${EDIT_HINTS[block]}` };
}
