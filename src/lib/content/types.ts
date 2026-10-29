/** Shapes of a unit package (content/schema/unit.schema.json). */
export type QuestionKind = "mcq" | "fill_blank" | "true_false" | "order_words";

export interface PackageQuestion {
  id: string;
  skill?: "vocab" | "grammar" | "listening" | "reading";
  kind: QuestionKind;
  prompt: string;
  options?: string[];
  answer: number | string | string[];
  explanation_ar: string;
}

export interface TextBlock {
  type: "text";
  markdown_ar?: string;
}
export interface VideoBlock {
  type: "video";
  youtube_id?: string;
  video_title?: string;
  channel?: string;
  channel_url?: string;
  duration_sec?: number;
  start_sec?: number;
  end_sec?: number;
  needs_check?: boolean;
  approx_size_mb?: number;
  optional?: boolean;
}
export interface ReadingBlock {
  type: "reading";
  text_en?: string;
  word_count?: number;
}
export interface AudioBlock {
  type: "audio";
  text_en?: string;
}
export interface TableBlock {
  type: "table";
  headers?: string[];
  rows?: string[][];
}
export interface ExerciseBlock {
  type: "exercise";
  exercise?: PackageQuestion;
}

export interface GameBlock {
  type: "game";
  /** Stable id (e.g. "A1-01-g1"): finishing the game counts as an activity of the lesson. */
  id?: string;
  game?: "flashcards" | "match" | "listen" | "memory" | "speed" | "spell" | "swipe" | "dictation" | "pronounce";
  title_ar?: string;
}

export interface StoryBlock {
  type: "story";
  /** Stable id (e.g. "A1-01-s1"): reading it to the end counts as an activity of the lesson. */
  id?: string;
  title_ar?: string;
  panels?: { speaker: string; text_en: string; text_ar: string }[];
}

export type LessonBlock = TextBlock | VideoBlock | ReadingBlock | AudioBlock | TableBlock | ExerciseBlock | GameBlock | StoryBlock;

export interface PackageLesson {
  id: string;
  position: number;
  skill: "vocab" | "grammar" | "listening" | "reading" | "speaking" | "writing" | "review";
  title: string;
  est_minutes: number;
  blocks: LessonBlock[];
  speaking_task?: { prompt_en: string; helpful_phrases?: string[]; prep_seconds: number; max_seconds: number; rubric_focus?: string[] };
  writing_task?: { prompt_en: string; min_words: number; max_words: number; rubric_focus?: string[] };
}

export interface PackageVocab {
  id: string;
  word: string;
  ipa?: string;
  part_of_speech: string;
  meaning_ar: string;
  example_en: string;
  example_ar?: string;
}

export interface UnitPackage {
  path: string;
  code: string;
  version: number;
  level: string;
  position: number;
  title: string;
  topic: string;
  grammar_point: string;
  can_do: string[];
  vocab: PackageVocab[];
  lessons: PackageLesson[];
  quiz: { pass_percent?: number; questions: PackageQuestion[] };
  context_note?: string;
  /** Arabic name of the stop on the journey map (e.g. «المكلا»). */
  stop_ar?: string;
  /** AI conversation partner of the unit (a Hadrami character). */
  roleplay?: { character_ar: string; scenario_en: string; opening_en: string };
}

export const SKILL_LABELS: Record<PackageLesson["skill"], string> = {
  vocab: "مفردات",
  grammar: "قواعد",
  listening: "استماع",
  reading: "قراءة",
  speaking: "محادثة",
  writing: "كتابة",
  review: "مراجعة",
};
