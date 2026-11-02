/** Rules of the lesson video player (unit tested): no skipping ahead, surprise questions. */
import { choiceRound, seededRandom, type GameWord } from "@/lib/games/logic";
import type { VideoCheckpoint } from "@/lib/content/types";
import type { WatchRanges } from "@/lib/gamification/watch";

export interface Checkpoint {
  at: number;
  prompt: string;
  options: string[];
  answer: number;
  explanation?: string;
  /** Asked about the part just watched (from the content) or about the unit's words (fallback). */
  source: "content" | "words";
}

/** How far the student may move the video: up to what they already played (plus one second). */
export function canSeek(target: number, frontier: number): boolean {
  return target <= frontier + 1;
}

/** The furthest second already played, from the saved ranges. */
export function frontierOf(ranges: WatchRanges): number {
  return ranges.reduce((max, [, end]) => Math.max(max, end), 0);
}

/** The surprise question reached between two ticks of playback, if any. */
export function dueCheckpoint(list: Checkpoint[], prev: number, now: number, answered: Set<number>): Checkpoint | null {
  if (now < prev || now - prev > 3) return null; // a seek, not playback
  return list.find((c) => !answered.has(c.at) && prev < c.at && now >= c.at) ?? null;
}

/** Where «أعد مشاهدة الجزء» goes: the previous question (or 45 seconds back). */
export function rewindTarget(list: Checkpoint[], at: number): number {
  const before = list.filter((c) => c.at < at).map((c) => c.at);
  return before.length ? Math.max(...before) : Math.max(0, at - 45);
}

/**
 * The questions of a video: the ones written for it, or, when it has none, two questions about the
 * unit's words at 1/3 and 2/3 of the video.
 */
export function checkpointsFor(id: string, duration: number, content: VideoCheckpoint[] | undefined, words: GameWord[]): Checkpoint[] {
  if (content?.length) {
    return content
      .filter((c) => c.options.length >= 2 && c.answer >= 0 && c.answer < c.options.length && (!duration || c.at_sec < duration))
      .sort((a, b) => a.at_sec - b.at_sec)
      .map((c) => ({ at: c.at_sec, prompt: c.prompt_ar, options: c.options, answer: c.answer, explanation: c.explanation_ar, source: "content" }));
  }
  if (words.length < 4 || duration < 60) return [];
  return [1 / 3, 2 / 3].map((f, k) => {
    const rand = seededRandom(`${id}:${k}`);
    const target = words[Math.floor(rand() * words.length)];
    const options = choiceRound(target, words, 3, rand);
    return {
      at: Math.floor(duration * f),
      prompt: `ما معنى «${target.word}»؟`,
      options: options.map((o) => o.meaning),
      answer: options.findIndex((o) => o.id === target.id),
      source: "words",
    };
  });
}

export function formatTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** CSS gradient showing the watched parts of the timeline (left to right). */
export function rangesGradient(ranges: WatchRanges, duration: number, color: string): string {
  if (duration <= 0 || ranges.length === 0) return "none";
  const parts = ranges.map(([a, b]) => {
    const x = (Math.min(a, duration) / duration) * 100;
    const y = (Math.min(b, duration) / duration) * 100;
    return `transparent ${x}%, ${color} ${x}%, ${color} ${y}%, transparent ${y}%`;
  });
  return `linear-gradient(90deg, ${parts.join(", ")})`;
}
