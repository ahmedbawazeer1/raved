import { describe, expect, it } from "vitest";
import { checkAnswer } from "@shared/content/check-answer";
import { validateUnitPackage } from "../content/validate";
import { DEFAULT_TEMPLATES, lessonTemplateSpec, unitTemplateSpec } from "../factory/templates";
import { DEFAULT_PROFILE } from "../factory/profile";
import { makeExercises, makeQuiz, findWord } from "../factory/build/generate";
import { gateOne } from "../factory/build/qa";
import { buildFactoryUnit, plannedLessons, type UnitContext } from "./factory";

const words = ["hello", "name", "student", "teacher", "friend", "school", "from", "nice", "meet", "goodbye"].map((w) => ({
  word: w,
  pos: "noun" as const,
  meaning_ar: `معنى ${w}`,
  example_en: `This is the word ${w} in a sentence.`,
}));

const lessonTemplates = Object.fromEntries(
  DEFAULT_TEMPLATES.filter((t) => t.kind === "lesson").map((t) => [t.key, { title_ar: t.title_ar, spec: lessonTemplateSpec.parse(t.spec) }]),
);

const ctx: UnitContext = {
  pathSlug: "english",
  pathTitle: "الإنجليزية",
  level: { id: "l1", code: "A1" },
  unitRowId: "cu1",
  unit: {
    code: "A1-01",
    position: 1,
    title_en: "Hello!",
    title_ar: "التحية",
    stop_ar: "المكلا",
    situation_ar: "أول يوم دراسي في المكلا",
    task_ar: "يعرّف بنفسه لمعلم جديد",
    objectives: ["O01"],
    grammar: ["G01"],
    words,
    review: [],
    source_video: { youtube_id: "episode0001", title: "Episode 1: Hello" },
  },
  objectives: ["أحيّي وأعرّف بنفسي", "أسأل عن الاسم"],
  grammar: [{ text_en: "be: am / is / are", text_ar: "فعل الكون", example_en: "I am Hamza." }],
  review: [],
  known: words.map((w) => w.word),
  profile: DEFAULT_PROFILE,
  levelProfile: { code: "A1", framework: "cefr", video_language: "ar", unit_template: "standard" },
  unitTemplate: unitTemplateSpec.parse(DEFAULT_TEMPLATES.find((t) => t.key === "standard")!.spec),
  lessonTemplates,
  sources: [{ kind: "playlist", ref: "PLp22-4PivYmIFAnru_L7fnMhSV5YffLTZ", title: "ZAmericanEnglish", language: "ar" }],
};

const part = (start: number) => ({
  start_sec: start,
  end_sec: start + 150,
  summary_en: "The teacher greets the class and says names.",
  key_sentences: ["Hello, my name is Ali.", "Nice to meet you."],
  checkpoints: [{ at_sec: 40, prompt_ar: "ماذا قال المعلم؟", options: ["Hello", "Goodbye"], answer: 0, explanation_ar: "قال Hello." }],
});

/** A fake model: answers each kind of prompt with valid JSON. */
function fakeAsk(calls: string[]) {
  return async <T>(req: { prompt: string; youtubeUrl?: string }, check: (v: unknown) => { ok: true; value: T } | { ok: false; errors: string[] }) => {
    calls.push(req.prompt.slice(0, 30));
    let answer: unknown;
    if (req.prompt.startsWith("Watch this whole video")) {
      const keys = plannedLessons(ctx).map((l) => l.key);
      answer = { suitable: true, duration_sec: 900, parts: Object.fromEntries(keys.map((k, i) => [k, part(i * 150)])) };
    } else if (req.prompt.startsWith("You are a strict reviewer")) {
      answer = { lessons: [1, 2, 3, 4].map((position) => ({ position, scores: [5, 5, 5, 5, 5, 5], problems: [] })) };
    } else {
      const sections: Record<string, unknown> = {
        warmup: { markdown_ar: "اليوم أول يوم في المدرسة في المكلا. كيف تحيّي زميلك الجديد؟" },
        words: { headers: ["English", "العربية", "Example"], rows: words.map((w) => [w.word, w.meaning_ar, w.example_en]) },
        in_context: {
          sentences_en: ["Hello, I am Hamza.", "My name is Hamza.", "I am a student.", "She is my teacher.", "He is my friend.", "Nice to meet you."],
        },
        notice: { sentences_en: ["I am a student.", "She is a teacher.", "We are friends."] },
        rule: { markdown_ar: "نستخدم am مع I، و is مع he و she، و are مع we و they و you." },
        form: {
          headers: ["Subject", "Verb"],
          rows: [
            ["I", "am"],
            ["He / She", "is"],
            ["We / They", "are"],
          ],
        },
        write: { prompt_en: "Write two sentences about you.", min_words: 10, max_words: 40 },
        before: { markdown_ar: "حمزة يقابل سالم في الفصل. استمع: من أين سالم؟" },
        dialogue: {
          title_ar: "التعارف",
          panels: [
            { speaker: "Hamza", text_en: "Hello! My name is Hamza.", text_ar: "مرحباً! اسمي حمزة." },
            { speaker: "Salem", text_en: "Hi Hamza, I am Salem from Shibam.", text_ar: "أهلاً حمزة، أنا سالم من شبام." },
            { speaker: "Hamza", text_en: "Nice to meet you, Salem.", text_ar: "سعيد بلقائك يا سالم." },
            { speaker: "Salem", text_en: "Nice to meet you too, my friend.", text_ar: "وأنا كذلك يا صديقي." },
          ],
        },
        speak: { prompt_en: "Introduce yourself to a new student.", helpful_phrases: ["My name is…"] },
        story: {
          title_ar: "رحلة حمزة وريم",
          panels: [
            { speaker: "Reem", text_en: "Hello, I am Reem.", text_ar: "مرحباً، أنا ريم." },
            { speaker: "Hamza", text_en: "Hi Reem, I am Hamza, a new student.", text_ar: "أهلاً ريم، أنا حمزة، طالب جديد." },
            { speaker: "Reem", text_en: "Our teacher is nice.", text_ar: "معلمنا لطيف." },
          ],
        },
        task: { prompt_en: "Greet a new teacher and say your name." },
      };
      answer = {
        title_ar: "درس",
        sections,
        roleplay: {
          character_ar: "مستر باوزير، معلّم في المكلا",
          scenario_en: "You are Mr. Bawazir, a kind teacher in Mukalla. Greet the new student.",
          opening_en: "Good morning!",
        },
      };
    }
    const r = check(answer);
    if (!r.ok) throw new Error(r.errors.join("; "));
    return { value: r.value, model: "fake" };
  };
}

describe("code generators", () => {
  it("makes exercises whose answers are right by construction", () => {
    const src = { words, sentences: ["Hello, my name is Hamza.", "She is my teacher.", "He is a good friend from school."], panels: [] };
    const ex = makeExercises(["mcq", "fill_blank", "order_words"], 6, src, "seed", "x-");
    expect(ex.length).toBe(6);
    for (const q of ex) {
      if (q.kind === "fill_blank") expect(findWord(q.prompt.replace("___", String(q.answer)), String(q.answer))).not.toBeNull();
      if (q.kind === "mcq") expect(q.options![q.answer as number]).toContain("معنى");
      if (q.kind === "order_words") expect(checkAnswer(q, q.answer)).toBe(true);
    }
    // Same seed → same exercises (a rebuild does not reshuffle the lesson).
    expect(makeExercises(["mcq", "fill_blank", "order_words"], 6, src, "seed", "x-")).toEqual(ex);
  });

  it("makes a quiz within the template's range", () => {
    const quiz = makeQuiz({ words, sentences: words.map((w) => w.example_en), panels: [] }, 8, 10, "A1-01");
    expect(quiz.length).toBeGreaterThanOrEqual(8);
    expect(new Set(quiz.map((q) => q.id)).size).toBe(quiz.length);
  });
});

describe("factory_unit", () => {
  it("builds a whole unit from the map: one watched episode split across the lessons, then text, code exercises and quiz", async () => {
    const calls: string[] = [];
    const saved: unknown[] = [];
    const out = await buildFactoryUnit(
      { id: "j1", input: { curriculum_unit_id: "cu1" } },
      ctx,
      [],
      "system",
      fakeAsk(calls),
      { search: async () => [], validate: (pkg) => ({ ok: true, errors: validateUnitPackage(pkg).errors.filter((e) => e.level === "error") }) },
      async () => {},
      async (p) => void saved.push(p),
    );
    const pkg = out.package;
    expect(pkg.lessons).toHaveLength(4);
    for (const l of pkg.lessons) {
      const videos = l.blocks.filter((b) => b.type === "video");
      expect(videos).toHaveLength(1);
      expect(videos[0]).toMatchObject({ youtube_id: "episode0001", optional: false });
      expect(l.blocks.some((b) => b.type === "exercise")).toBe(true);
    }
    expect(pkg.lessons[0].blocks.find((b) => b.type === "video")).toMatchObject({ start_sec: 0, end_sec: 150 });
    expect(pkg.lessons[1].blocks.find((b) => b.type === "video")).toMatchObject({ start_sec: 150, end_sec: 300 });
    expect(pkg.quiz.questions.length).toBeGreaterThanOrEqual(8);
    expect(pkg.roleplay?.character_ar).toContain("باوزير");
    expect(validateUnitPackage(pkg).errors.filter((e) => e.level === "error")).toEqual([]);
    // 1 episode watch + 4 lessons + 1 critic; the critic found nothing, so nothing was rewritten.
    expect(calls).toHaveLength(6);
    expect(out.factory.qa.rewritten).toEqual([]);
    expect(out.factory.qa.issues.filter((i) => i.severity === "error")).toEqual([]);
    expect(saved.length).toBeGreaterThan(0);
  });

  it("flags unsuitable words in gate 1", () => {
    const pkg = {
      code: "A1-01",
      lessons: [{ position: 1, title: "x", skill: "vocab", est_minutes: 5, blocks: [{ type: "audio", text_en: "We drink beer at the market." }] }],
      quiz: { questions: [] },
      vocab: [],
    } as never;
    const issues = gateOne({ pkg, words: [], known: [], quizMin: 8, schemaErrors: [] });
    expect(issues.some((i) => i.message.includes("beer"))).toBe(true);
    expect(issues.some((i) => i.message.includes("فيديو"))).toBe(true);
  });
});

describe("section editing", () => {
  it("round-trips every block type through its plain-text format", async () => {
    const { sectionToText, textToSection } = await import("../factory/build/content");
    const samples = [
      { block: "text", markdown_ar: "شرح القاعدة بالعربية مع مثال واضح." },
      {
        block: "table",
        headers: ["Subject", "Verb"],
        rows: [
          ["I", "am"],
          ["He", "is"],
        ],
      },
      { block: "audio", sentences_en: ["I am Hamza.", "She is Reem."] },
      {
        block: "story",
        title_ar: "التعارف",
        panels: [
          { speaker: "Hamza", text_en: "Hello!", text_ar: "مرحباً!" },
          { speaker: "Reem", text_en: "Hi!", text_ar: "أهلاً!" },
          { speaker: "Hamza", text_en: "Bye!", text_ar: "مع السلامة!" },
        ],
      },
      { block: "speaking_task", prompt_en: "Introduce yourself to a new student.", helpful_phrases: ["My name is…"], rubric_focus: [] },
      { block: "writing_task", prompt_en: "Write about your family in Mukalla.", min_words: 20, max_words: 60, rubric_focus: [] },
    ] as const;
    for (const s of samples) {
      const r = textToSection(s.block, sectionToText(s as never));
      expect(r.ok, s.block).toBe(true);
      if (r.ok) expect(r.value).toEqual(s);
    }
    expect(textToSection("story", "Hamza | Hello").ok).toBe(false);
  });
});
