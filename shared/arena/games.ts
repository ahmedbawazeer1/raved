/**
 * The arena's five games (owner-approved names). Rounds are built and graded by the database
 * (arena_start / arena_answer / arena_finish) from the words of units the student studied.
 */
import { z } from "zod";

export const ARENA_GAMES = ["drops", "bridge", "net", "errors", "echo"] as const;
export type ArenaGame = (typeof ARENA_GAMES)[number];
export type ArenaMode = "bot" | "online";

export const GAME_INFO: Record<ArenaGame, { name: string; tagline: string; howTo: string; colour: string }> = {
  drops: { name: "سباق القطرات", tagline: "وصّل الكلمة بمعناها بسرعة", howTo: "كل إجابة صحيحة قطرة تملأ قارورتك.", colour: "#2E9BD6" },
  bridge: { name: "جسر الكلمات", tagline: "رتّب الجملة لتبني الجسر", howTo: "كل جملة صحيحة لوح في الجسر.", colour: "#C77F06" },
  net: { name: "شبكة الصيّاد", tagline: "اصطد الكلمات المطلوبة", howTo: "اضغط الكلمة التي تطابق المعنى.", colour: "#1F7A6E" },
  errors: { name: "صيّاد الأخطاء", tagline: "اضغط الكلمة الخطأ قبل السدّ", howTo: "في كل جملة كلمة واحدة خطأ.", colour: "#B42318" },
  echo: { name: "صدى الوادي", tagline: "اسمع الجملة واكتبها", howTo: "استمع، ثم اكتب ما سمعت.", colour: "#6941C6" },
};

export const isArenaGame = (g: string): g is ArenaGame => (ARENA_GAMES as readonly string[]).includes(g);

const step = z.object({ t: z.number(), ok: z.boolean() });
export const opponentSchema = z.object({
  kind: z.enum(["bot", "ghost"]),
  name: z.string(),
  avatar: z.unknown().optional(),
  fallback: z.boolean().optional(),
  score: z.number(),
  timeline: z.array(step).nullable().default([]),
});
export type Opponent = z.infer<typeof opponentSchema>;

const question = z.object({
  prompt: z.string().optional(),
  options: z.array(z.string()).optional(),
  tiles: z.array(z.string()).optional(),
  words: z.array(z.string()).optional(),
  say: z.string().optional(),
});
export type ArenaQuestion = z.infer<typeof question>;

export const runSchema = z.object({
  id: z.string(),
  game: z.enum(ARENA_GAMES),
  questions: z.array(question),
  total: z.number(),
  opponent: opponentSchema,
  level: z.string().optional(),
});
export type ArenaRun = z.infer<typeof runSchema>;

export const answerSchema = z.object({ ok: z.boolean(), answer: z.string().nullable(), t: z.number() });
export const finishSchema = z.object({
  score: z.number(),
  total: z.number(),
  answers: z.array(z.string()),
  opponent_score: z.number(),
  won: z.boolean(),
  drops: z.number(),
  drops_today: z.number(),
});
export type ArenaFinish = z.infer<typeof finishSchema>;

/** How many of the opponent's answers are in (and right) after `ms` of play. */
export function opponentAt(op: Opponent, ms: number): { answered: number; right: number } {
  let answered = 0,
    right = 0;
  for (const s of op.timeline ?? []) {
    if (s.t > ms) break;
    answered += 1;
    if (s.ok) right += 1;
  }
  return { answered, right };
}

/** Errors the database can raise, in Arabic. */
export function arenaError(message: string | undefined): string {
  if (message?.includes("not_enough_words")) return "هذه اللعبة تحتاج كلمات وجملاً أكثر. أكمل درساً آخر ثم ارجع.";
  if (message?.includes("too_many_runs")) return "لعبت كثيراً اليوم! ارتح قليلاً وارجع غداً.";
  return "تعذّر بدء اللعبة. حاول مرة أخرى.";
}
