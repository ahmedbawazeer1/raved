/**
 * Splits a lesson into steps shown one at a time (unit tested): the mandatory video first, then
 * each part of the lesson on its own (explanation, reading, listening, exercises, game, story).
 * Consecutive blocks of the same kind stay together; all exercises form one step.
 */
import type { LessonBlock } from "../content/types";

export type SectionKind = "video" | "explain" | "reading" | "listening" | "exercises" | "game" | "story";

export interface LessonSection {
  key: string;
  kind: SectionKind;
  title: string;
  blocks: LessonBlock[];
  /** Exercise/game/story ids that must be solved before moving on. */
  requires: string[];
}

const TITLES: Record<SectionKind, string> = {
  video: "فيديو الدرس",
  explain: "الشرح",
  reading: "القراءة",
  listening: "الاستماع",
  exercises: "التمارين",
  game: "لعبة",
  story: "القصة",
};

export const SECTION_ICONS: Record<SectionKind | "task" | "finish", string> = {
  video: "🎬",
  explain: "📖",
  reading: "📰",
  listening: "🎧",
  exercises: "✍️",
  game: "🎮",
  story: "📚",
  task: "🗣️",
  finish: "🏁",
};

/** A mandatory lesson video (tracked), which always comes first. */
export function isLeadVideo(b: LessonBlock): boolean {
  return b.type === "video" && Boolean(b.youtube_id) && !b.needs_check;
}

function kindOf(b: LessonBlock): SectionKind | null {
  switch (b.type) {
    case "text":
    case "table":
    case "video":
      return "explain";
    case "reading":
      return "reading";
    case "audio":
      return "listening";
    case "exercise":
      return b.exercise ? "exercises" : null;
    case "game":
      return b.id && b.game ? "game" : null;
    case "story":
      return b.id && b.panels?.length ? "story" : null;
    default:
      return null;
  }
}

function idOf(b: LessonBlock): string | null {
  if (b.type === "exercise") return b.exercise?.id ?? null;
  if (b.type === "game" || b.type === "story") return b.id ?? null;
  return null;
}

export function lessonSections(blocks: LessonBlock[]): LessonSection[] {
  const sections: LessonSection[] = [];
  const lead = blocks.filter(isLeadVideo);
  if (lead.length) sections.push({ key: "video", kind: "video", title: TITLES.video, blocks: lead, requires: [] });

  let exercises: LessonSection | null = null;
  for (const b of blocks) {
    if (isLeadVideo(b)) continue;
    const kind = kindOf(b);
    if (!kind) continue;
    const id = idOf(b);
    if (kind === "exercises") {
      if (!exercises) {
        exercises = { key: "exercises", kind, title: TITLES.exercises, blocks: [], requires: [] };
        sections.push(exercises);
      }
      exercises.blocks.push(b);
      if (id) exercises.requires.push(id);
      continue;
    }
    const last = sections[sections.length - 1];
    // Games and stories are always their own step; other kinds merge with the step before.
    if (last && last.kind === kind && kind !== "game" && kind !== "story") {
      last.blocks.push(b);
      continue;
    }
    const again = sections.some((x) => x.kind === kind) && kind === "explain";
    const title = (b.type === "game" || b.type === "story") && b.title_ar ? b.title_ar : again ? "تتمة الشرح" : TITLES[kind];
    sections.push({ key: `${kind}-${sections.length}`, kind, title, blocks: [b], requires: id ? [id] : [] });
  }
  return sections;
}
