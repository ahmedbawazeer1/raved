/**
 * «مصنع المحتوى» templates: what a lesson and a unit are made of, as data (table content_templates,
 * edited by the admin in the content studio). The builder — «عقل رفد» or a teacher — fills a template;
 * it never invents the shape. Unit tested; the defaults below are also the migration's seed.
 *
 * Every section follows Merrill's cycle (phase): activate what the student knows → demonstrate the new
 * language → apply it in practice → integrate it in a real task. `source` says who fills the section:
 * the model (text it writes), code (exercises and games generated from the lesson's sentences and words,
 * so the right answer is always right), or the unit's video.
 */
import { z } from "zod";

export const TEMPLATE_KEY = /^[a-z][a-z0-9_]{1,40}$/;

export const SECTION_BLOCKS = ["text", "video", "reading", "audio", "table", "exercise", "game", "story", "speaking_task", "writing_task"] as const;
export const SECTION_SOURCES = ["model", "code", "video"] as const;
export const PHASES = ["activate", "demonstrate", "apply", "integrate"] as const;
export const LESSON_SKILLS = ["vocab", "grammar", "listening", "reading", "speaking", "writing", "review"] as const;
export const EXERCISE_KINDS = ["mcq", "fill_blank", "true_false", "order_words"] as const;
export const GAMES = ["flashcards", "match", "listen", "memory", "speed", "spell", "swipe", "dictation", "pronounce"] as const;

export const PHASE_LABELS: Record<(typeof PHASES)[number], string> = {
  activate: "تنشيط",
  demonstrate: "عرض",
  apply: "تطبيق",
  integrate: "دمج",
};
export const SOURCE_LABELS: Record<(typeof SECTION_SOURCES)[number], string> = {
  model: "يكتبه الوكيل أو المعلم",
  code: "يولّده النظام آلياً",
  video: "من فيديو الوحدة",
};

const range = z.tuple([z.number().int().min(0).max(30), z.number().int().min(0).max(30)]).refine(([a, b]) => a <= b, "الحد الأدنى أكبر من الأعلى");

export const sectionSchema = z
  .object({
    key: z.string().regex(/^[a-z][a-z0-9_]{1,30}$/),
    title_ar: z.string().min(2).max(60),
    block: z.enum(SECTION_BLOCKS),
    source: z.enum(SECTION_SOURCES),
    phase: z.enum(PHASES),
    count: range.optional(),
    kinds: z.array(z.string().min(2).max(30)).max(10).optional(),
    guide_en: z.string().min(10).max(800),
    optional: z.boolean().optional(),
  })
  .superRefine((s, ctx) => {
    if (s.block === "exercise" && s.kinds?.some((k) => !(EXERCISE_KINDS as readonly string[]).includes(k)))
      ctx.addIssue({ code: "custom", path: ["kinds"], message: `أنواع التمارين المسموحة: ${EXERCISE_KINDS.join(", ")}` });
    if (s.block === "game" && s.kinds?.some((k) => !(GAMES as readonly string[]).includes(k)))
      ctx.addIssue({ code: "custom", path: ["kinds"], message: `الألعاب المسموحة: ${GAMES.join(", ")}` });
    if (s.source === "video" && s.block !== "video") ctx.addIssue({ code: "custom", path: ["source"], message: "مصدر الفيديو لقسم الفيديو فقط" });
    if (s.source === "code" && !["exercise", "game"].includes(s.block))
      ctx.addIssue({ code: "custom", path: ["source"], message: "النظام يولّد التمارين والألعاب فقط" });
  });

export const lessonTemplateSpec = z
  .object({
    skill: z.enum(LESSON_SKILLS),
    est_minutes: z.number().int().min(3).max(60),
    sections: z.array(sectionSchema).min(2).max(12),
  })
  .superRefine((t, ctx) => {
    const keys = new Set<string>();
    t.sections.forEach((s, i) => {
      if (keys.has(s.key)) ctx.addIssue({ code: "custom", path: ["sections", i, "key"], message: `مفتاح مكرر: ${s.key}` });
      keys.add(s.key);
    });
    if (!t.sections.some((s) => s.phase === "apply")) ctx.addIssue({ code: "custom", path: ["sections"], message: "الدرس يحتاج قسماً للتطبيق" });
    // Owner decision (2026-11-08): every lesson has a mandatory video.
    if (t.sections.filter((s) => s.block === "video").length !== 1)
      ctx.addIssue({ code: "custom", path: ["sections"], message: "كل درس يحتاج قسم فيديو واحداً بالضبط" });
  });

export const unitTemplateSpec = z.object({
  lessons: z
    .array(z.object({ template: z.string().regex(TEMPLATE_KEY) }))
    .min(2)
    .max(8),
  objectives: range,
  new_words: range,
  review_words: range,
  quiz: z.object({ min: z.number().int().min(5).max(20), max: z.number().int().min(5).max(20), pass_percent: z.number().int().min(50).max(100) }),
});

export type LessonTemplateSpec = z.infer<typeof lessonTemplateSpec>;
export type UnitTemplateSpec = z.infer<typeof unitTemplateSpec>;
export type TemplateSection = z.infer<typeof sectionSchema>;

export interface TemplateRow {
  kind: "lesson" | "unit";
  key: string;
  title_ar: string;
  description_ar: string;
  spec: unknown;
}

/** Validates a template's spec for its kind; returns Arabic messages (empty = valid). */
export function templateErrors(kind: "lesson" | "unit", spec: unknown): string[] {
  const r = kind === "lesson" ? lessonTemplateSpec.safeParse(spec) : unitTemplateSpec.safeParse(spec);
  return r.success ? [] : r.error.issues.slice(0, 8).map((i) => `${i.path.join(".") || "القالب"}: ${i.message}`);
}

/** A unit template may only use lesson templates that exist. */
export function missingLessonTemplates(unit: UnitTemplateSpec, lessonKeys: Iterable<string>): string[] {
  const have = new Set(lessonKeys);
  return unit.lessons.map((l) => l.template).filter((k) => !have.has(k));
}

// ---------------------------------------------------------------------------------------------
// The default templates (seeded by migration 20261108000200_content_factory.sql; a test keeps them equal).
// ---------------------------------------------------------------------------------------------

/** The mandatory video section every lesson template has (chosen per lesson by the factory). */
function watch(guide_en: string): TemplateSection {
  return { key: "watch", title_ar: "شاهد", block: "video", source: "video", phase: "demonstrate", guide_en };
}

export const DEFAULT_TEMPLATES: TemplateRow[] = [
  {
    kind: "lesson",
    key: "vocab",
    title_ar: "درس مفردات",
    description_ar: "يعرّف بكلمات الوحدة في موقفها اليومي بفيديو وجدول وجمل، ثم يثبّتها بالتمارين والألعاب.",
    spec: {
      skill: "vocab",
      est_minutes: 15,
      sections: [
        {
          key: "warmup",
          title_ar: "قبل أن نبدأ",
          block: "text",
          source: "model",
          phase: "activate",
          guide_en:
            "2–3 short Arabic lines that set the unit's everyday scene and ask the student what they already know or would say in it. No new English yet.",
        },
        watch("A 2–8 minute part of a video that teaches or uses this lesson's new words, with 2–3 surprise questions about what was just said."),
        {
          key: "words",
          title_ar: "الكلمات",
          block: "table",
          source: "model",
          phase: "demonstrate",
          guide_en: "A table of the unit's new words: English | Arabic meaning | a short example sentence from the unit's situation.",
        },
        {
          key: "in_context",
          title_ar: "الكلمات في الموقف",
          block: "audio",
          source: "model",
          phase: "demonstrate",
          guide_en: "6–10 short English sentences (read aloud by the app) that use every new word in the unit's situation, in order.",
        },
        {
          key: "practice",
          title_ar: "تدرّب",
          block: "exercise",
          source: "code",
          phase: "apply",
          count: [4, 6],
          kinds: ["mcq", "fill_blank"],
          guide_en: "Generated from the words and the in-context sentences: meaning choice and fill the missing word.",
        },
        {
          key: "game",
          title_ar: "العب",
          block: "game",
          source: "code",
          phase: "apply",
          kinds: ["match", "listen", "flashcards"],
          guide_en: "One vocabulary game with the unit's words.",
        },
      ],
    },
  },
  {
    kind: "lesson",
    key: "grammar",
    title_ar: "درس قاعدة",
    description_ar: "فيديو يشرح القاعدة، ثم شرح بالعربية بأمثلة من الموقف، وتمارين ترتيب وإكمال.",
    spec: {
      skill: "grammar",
      est_minutes: 15,
      sections: [
        {
          key: "notice",
          title_ar: "لاحظ",
          block: "audio",
          source: "model",
          phase: "activate",
          guide_en: "3–4 English sentences from the unit's situation that contain the grammar point (read aloud).",
        },
        watch("A 2–8 minute part of a video that explains this grammar point, with 2–3 surprise questions."),
        {
          key: "rule",
          title_ar: "القاعدة",
          block: "text",
          source: "model",
          phase: "demonstrate",
          guide_en:
            "Explain the grammar point in simple Arabic (markdown): when we use it, the form, and the most common mistake of Arabic speakers. Use the sentences above and from the video as examples.",
        },
        {
          key: "form",
          title_ar: "الصيغة",
          block: "table",
          source: "model",
          phase: "demonstrate",
          guide_en: "A small table of the form (e.g. subject | verb | example).",
        },
        {
          key: "practice",
          title_ar: "تدرّب",
          block: "exercise",
          source: "code",
          phase: "apply",
          count: [4, 6],
          kinds: ["order_words", "fill_blank", "mcq"],
          guide_en: "Generated from the grammar example sentences: put the words in order, fill the form, choose the right form.",
        },
        {
          key: "write",
          title_ar: "اكتب",
          block: "writing_task",
          source: "model",
          phase: "integrate",
          optional: true,
          guide_en: "A 2–3 sentence writing task about the student's own everyday life using the grammar point.",
        },
      ],
    },
  },
  {
    kind: "lesson",
    key: "dialogue",
    title_ar: "درس حوار",
    description_ar: "مقطع محادثة، ثم حوار قصير في الموقف بين شخصيات يمنية، أسئلة فهم، ومهمة تحدث.",
    spec: {
      skill: "listening",
      est_minutes: 15,
      sections: [
        {
          key: "before",
          title_ar: "قبل الاستماع",
          block: "text",
          source: "model",
          phase: "activate",
          guide_en: "One Arabic line: who is talking, where, and what to listen for.",
        },
        watch("A 1–6 minute part of a video with a real conversation in a similar everyday situation, with 2–3 surprise questions."),
        {
          key: "dialogue",
          title_ar: "الحوار",
          block: "story",
          source: "model",
          phase: "demonstrate",
          guide_en:
            "A 6–10 line dialogue in the unit's situation between Yemeni characters (speaker, text_en, text_ar). Uses the new words and the grammar point; nothing above the level.",
        },
        {
          key: "check",
          title_ar: "هل فهمت؟",
          block: "exercise",
          source: "code",
          phase: "apply",
          count: [3, 4],
          kinds: ["true_false", "mcq"],
          guide_en: "Generated from the dialogue lines: who said it, true or false.",
        },
        {
          key: "speak",
          title_ar: "تحدّث",
          block: "speaking_task",
          source: "model",
          phase: "integrate",
          guide_en: "A speaking task: the student plays one role of the dialogue in their own words (30–60 seconds).",
        },
      ],
    },
  },
  {
    kind: "lesson",
    key: "review",
    title_ar: "درس مراجعة",
    description_ar: "مقطع مراجعة، حلقة من قصة الوحدة تجمع ما تعلّمه الطالب، تمارين مختلطة، ومهمة حقيقية.",
    spec: {
      skill: "review",
      est_minutes: 18,
      sections: [
        watch("A 2–8 minute part of a video that reviews the unit's language, or an authentic scene in a similar situation, with 2–3 surprise questions."),
        {
          key: "story",
          title_ar: "قصة الوحدة",
          block: "story",
          source: "model",
          phase: "activate",
          guide_en:
            "An episode of the unit's story with two Yemeni students (common first names, varied between units) in the unit's situation: 6–10 panels (speaker, text_en, text_ar) using the unit's words, grammar and 2–3 review words from earlier units.",
        },
        {
          key: "mixed",
          title_ar: "مراجعة مختلطة",
          block: "exercise",
          source: "code",
          phase: "apply",
          count: [5, 8],
          kinds: ["mcq", "fill_blank", "order_words", "true_false"],
          guide_en: "Generated from all of the unit's sentences and words, including review words.",
        },
        {
          key: "game",
          title_ar: "تحدي السرعة",
          block: "game",
          source: "code",
          phase: "apply",
          kinds: ["speed", "memory", "spell"],
          guide_en: "One fast game with all of the unit's words.",
        },
        {
          key: "task",
          title_ar: "المهمة",
          block: "speaking_task",
          source: "model",
          phase: "integrate",
          guide_en: "The unit's real-world task (from the curriculum) as a speaking task set in everyday Yemeni life.",
        },
      ],
    },
  },
  {
    kind: "unit",
    key: "standard",
    title_ar: "الوحدة القياسية",
    description_ar: "مفردات ← قاعدة ← حوار ← مراجعة، كل درس بفيديو، ثم اختبار الوحدة.",
    spec: {
      lessons: [{ template: "vocab" }, { template: "grammar" }, { template: "dialogue" }, { template: "review" }],
      objectives: [2, 4],
      new_words: [8, 12],
      review_words: [2, 4],
      quiz: { min: 8, max: 10, pass_percent: 70 },
    },
  },
];
