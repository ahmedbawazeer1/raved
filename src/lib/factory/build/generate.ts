/**
 * The factory's code generators: exercises, games and the unit quiz are made from the lesson's own
 * sentences and words, so the right answer is always right (no model writes an answer key). Then the
 * unit package is assembled in the shape content/schema/unit.schema.json expects. Pure; unit tested.
 */
import { shuffleWords } from "@shared/content/check-answer";
import type { LessonBlock, PackageLesson, PackageQuestion, PackageVocab, UnitPackage, VideoBlock } from "@shared/content/types";
import type { MapWord } from "../curriculum";
import type { LessonTemplateSpec, TemplateSection } from "../templates";
import type { SectionContent } from "./content";

export interface WordItem extends MapWord {
  /** Review words come from earlier units (meaning and example from their map). */
  review?: boolean;
}

/** A small deterministic random source (same unit → same exercises on every rebuild). */
export function seeded(seed: string) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

function pick<T>(list: T[], n: number, rnd: () => number, avoid: (x: T) => boolean = () => false): T[] {
  const pool = list.filter((x) => !avoid(x));
  const out: T[] = [];
  while (pool.length && out.length < n) out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
  return out;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Finds `word` as a whole word (case-insensitive) in `sentence`. */
export function findWord(sentence: string, word: string): RegExpExecArray | null {
  return new RegExp(`(^|[^A-Za-z'])(${escapeRe(word)})(?=$|[^A-Za-z'])`, "i").exec(sentence);
}

const tokens = (s: string) =>
  s
    .replace(/[.!?]+$/, "")
    .split(/\s+/)
    .filter(Boolean);

/** English sentences of a lesson's content, in order (examples of words first). */
export function sentencesOf(contents: SectionContent[], words: WordItem[] = []): string[] {
  const out: string[] = [];
  for (const c of contents) {
    if (c.block === "audio") out.push(...c.sentences_en);
    if (c.block === "story") out.push(...c.panels.map((p) => p.text_en));
    if (c.block === "reading") out.push(...c.text_en.split(/(?<=[.!?])\s+/));
  }
  out.push(...words.map((w) => w.example_en));
  return [...new Set(out.map((s) => s.trim()).filter((s) => s.length > 2))];
}

export type ExerciseKind = "mcq" | "fill_blank" | "true_false" | "order_words";

export interface ExerciseSource {
  words: WordItem[];
  sentences: string[];
  /** Dialogue/story lines for "who said it" true/false questions. */
  panels: { speaker: string; text_en: string; text_ar: string }[];
}

/** One exercise of a kind, or null when the material cannot make one. */
function makeOne(kind: ExerciseKind, src: ExerciseSource, rnd: () => number, used: Set<string>, id: string): PackageQuestion | null {
  if (kind === "mcq") {
    const [w] = pick(src.words, 1, rnd, (x) => used.has(`m:${x.word}`));
    if (!w) return null;
    const others = pick(src.words, 3, rnd, (x) => x.word === w.word || x.meaning_ar === w.meaning_ar);
    if (others.length < 2) return null;
    used.add(`m:${w.word}`);
    const options = shuffleWords([w.meaning_ar, ...others.map((o) => o.meaning_ar)], id);
    return {
      id,
      skill: "vocab",
      kind: "mcq",
      prompt: `What does «${w.word}» mean?`,
      options,
      answer: options.indexOf(w.meaning_ar),
      explanation_ar: `«${w.word}» تعني «${w.meaning_ar}». مثال: ${w.example_en}`,
    };
  }
  if (kind === "fill_blank") {
    for (const s of pick(src.sentences, src.sentences.length, rnd)) {
      const w = src.words.find((x) => !used.has(`f:${x.word}`) && findWord(s, x.word));
      if (!w) continue;
      const m = findWord(s, w.word)!;
      used.add(`f:${w.word}`);
      const prompt = `${s.slice(0, m.index + m[1].length)}___${s.slice(m.index + m[0].length)}`;
      return { id, skill: "vocab", kind: "fill_blank", prompt, answer: m[2], explanation_ar: `الكلمة الناقصة «${m[2]}» (${w.meaning_ar}).` };
    }
    return null;
  }
  if (kind === "order_words") {
    for (const s of pick(src.sentences, src.sentences.length, rnd)) {
      const t = tokens(s);
      if (t.length < 3 || t.length > 9 || used.has(`o:${s}`)) continue;
      used.add(`o:${s}`);
      return {
        id,
        skill: "grammar",
        kind: "order_words",
        prompt: `رتب الكلمات: ${shuffleWords(t, id).join(" / ")}`,
        answer: t,
        explanation_ar: `الترتيب الصحيح: ${t.join(" ")}`,
      };
    }
    return null;
  }
  // true_false: "who said it", from the dialogue or story lines.
  const speakers = [...new Set(src.panels.map((p) => p.speaker))];
  if (speakers.length < 2) return null;
  const [line] = pick(src.panels, 1, rnd, (p) => used.has(`t:${p.text_en}`) || tokens(p.text_en).length < 3);
  if (!line) return null;
  used.add(`t:${line.text_en}`);
  const truth = rnd() < 0.5;
  const speaker = truth ? line.speaker : speakers.find((s) => s !== line.speaker)!;
  return {
    id,
    skill: "listening",
    kind: "true_false",
    prompt: `${speaker} says: "${line.text_en}"`,
    options: ["True", "False"],
    answer: truth ? 0 : 1,
    explanation_ar: `الذي قال «${line.text_en}» هو ${line.speaker}.`,
  };
}

/** Exercises of the allowed kinds, rotating kinds; fewer if the material runs out. */
export function makeExercises(
  kinds: ExerciseKind[],
  count: number,
  src: ExerciseSource,
  seed: string,
  idPrefix: string,
  used = new Set<string>(),
): PackageQuestion[] {
  const rnd = seeded(seed);
  const out: PackageQuestion[] = [];
  let k = 0;
  let misses = 0;
  while (out.length < count && misses < kinds.length * 2) {
    const q = makeOne(kinds[k % kinds.length], src, rnd, used, `${idPrefix}${out.length + 1}`);
    k++;
    if (q) {
      out.push(q);
      misses = 0;
    } else misses++;
  }
  return out;
}

/** The unit quiz: a mix covering words, grammar sentences and the dialogue (graded on the server). */
export function makeQuiz(src: ExerciseSource, min: number, max: number, code: string): PackageQuestion[] {
  const target = Math.max(min, Math.min(max, Math.round((src.words.length + 6) / 2)));
  const plan: ExerciseKind[] = [];
  for (let i = 0; i < target; i++) plan.push((["mcq", "fill_blank", "order_words", "mcq", "fill_blank", "true_false"] as const)[i % 6]);
  const rnd = seeded(`${code}:quiz`);
  const used = new Set<string>();
  const out: PackageQuestion[] = [];
  for (const kind of plan) {
    const q = makeOne(kind, src, rnd, used, `${code}-q${out.length + 1}`) ?? makeOne("mcq", src, rnd, used, `${code}-q${out.length + 1}`);
    if (q) out.push(q);
  }
  return out;
}

export interface LessonBuild {
  template: LessonTemplateSpec;
  templateKey: string;
  title_ar: string;
  /** Content written by the model or the teacher, by section key. */
  sections: Record<string, SectionContent>;
  video: VideoBlock;
}

const PANEL_SECTION_BLOCKS = new Set(["story"]);

/** One lesson's blocks, in the template's order. */
export function assembleLesson(code: string, n: number, lesson: LessonBuild, words: WordItem[]): PackageLesson {
  const contents = Object.values(lesson.sections);
  const src: ExerciseSource = {
    words,
    sentences: sentencesOf(
      contents,
      words.filter((w) => !w.review),
    ),
    panels: contents.flatMap((c) => (PANEL_SECTION_BLOCKS.has(c.block) && c.block === "story" ? c.panels : [])),
  };
  const used = new Set<string>();
  const blocks: LessonBlock[] = [];
  let speaking: PackageLesson["speaking_task"];
  let writing: PackageLesson["writing_task"];
  const id = `${code}-L${n}`;
  lesson.template.sections.forEach((s: TemplateSection, i: number) => {
    const c = lesson.sections[s.key];
    if (s.block === "video") blocks.push(lesson.video);
    else if (s.block === "exercise") {
      const [lo, hi] = s.count ?? [3, 5];
      const kinds = (s.kinds?.length ? s.kinds : ["mcq", "fill_blank"]) as ExerciseKind[];
      const ex = makeExercises(kinds, Math.max(lo, Math.min(hi, lo + 1)), src, `${id}:${s.key}`, `${id}-e${i + 1}-`, used);
      blocks.push(...ex.map((exercise) => ({ type: "exercise" as const, exercise })));
    } else if (s.block === "game") {
      const games = (s.kinds?.length ? s.kinds : ["match"]) as NonNullable<Extract<LessonBlock, { type: "game" }>["game"]>[];
      blocks.push({ type: "game", id: `${id}-g${i + 1}`, game: games[n % games.length], title_ar: s.title_ar });
    } else if (c?.block === "text") blocks.push({ type: "text", markdown_ar: c.markdown_ar });
    else if (c?.block === "table") blocks.push({ type: "table", headers: c.headers, rows: c.rows });
    else if (c?.block === "audio") blocks.push({ type: "audio", text_en: c.sentences_en.join(" ") });
    else if (c?.block === "reading") blocks.push({ type: "reading", text_en: c.text_en, word_count: tokens(c.text_en).length });
    else if (c?.block === "story") blocks.push({ type: "story", id: `${id}-s${i + 1}`, title_ar: c.title_ar || s.title_ar, panels: c.panels });
    else if (c?.block === "speaking_task")
      speaking = { prompt_en: c.prompt_en, helpful_phrases: c.helpful_phrases, prep_seconds: 30, max_seconds: 60, rubric_focus: c.rubric_focus };
    else if (c?.block === "writing_task") writing = { prompt_en: c.prompt_en, min_words: c.min_words, max_words: c.max_words, rubric_focus: c.rubric_focus };
  });
  return {
    id,
    position: n,
    skill: lesson.template.skill,
    title: lesson.title_ar,
    est_minutes: lesson.template.est_minutes,
    blocks,
    ...(speaking ? { speaking_task: speaking } : {}),
    ...(writing ? { writing_task: writing } : {}),
  };
}

export interface UnitAssembly {
  path: string;
  code: string;
  level: string;
  position: number;
  title_en: string;
  title_ar: string;
  situation_ar: string;
  stop_ar: string;
  grammar_en: string;
  can_do: string[];
  words: WordItem[];
  lessons: LessonBuild[];
  quiz: { min: number; max: number; pass_percent: number };
  roleplay?: UnitPackage["roleplay"];
}

/** The whole unit package. */
export function assembleUnit(a: UnitAssembly): UnitPackage {
  const lessons = a.lessons.map((l, i) => assembleLesson(a.code, i + 1, l, a.words));
  const allContents = a.lessons.flatMap((l) => Object.values(l.sections));
  const vocab: PackageVocab[] = a.words
    .filter((w) => !w.review)
    .map((w, i) => ({ id: `${a.code}-v${i + 1}`, word: w.word, part_of_speech: w.pos, meaning_ar: w.meaning_ar, example_en: w.example_en }));
  const quiz = makeQuiz(
    {
      words: a.words.filter((w) => !w.review),
      sentences: sentencesOf(allContents, a.words),
      panels: allContents.flatMap((c) => (c.block === "story" ? c.panels : [])),
    },
    a.quiz.min,
    a.quiz.max,
    a.code,
  );
  return {
    path: a.path,
    code: a.code,
    version: 1,
    level: a.level,
    position: a.position,
    title: a.title_en,
    topic: a.situation_ar,
    grammar_point: a.grammar_en,
    can_do: a.can_do,
    vocab,
    lessons,
    quiz: { pass_percent: a.quiz.pass_percent, questions: quiz },
    stop_ar: a.stop_ar,
    ...(a.roleplay ? { roleplay: a.roleplay } : {}),
    context_note: a.title_ar,
  };
}
