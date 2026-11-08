/**
 * Spaced repetition for vocabulary (SM-2 style, three buttons). Pure and unit tested:
 * the same code schedules on the server (official) and in the browser (offline display).
 */
export type Grade = "again" | "hard" | "good";

export const GRADES: readonly Grade[] = ["again", "hard", "good"];

export interface SrsState {
  ease: number;
  intervalDays: number;
  repetitions: number;
  lapses: number;
}

export interface Scheduled extends SrsState {
  dueAt: Date;
}

export const NEW_CARD: SrsState = { ease: 2.5, intervalDays: 0, repetitions: 0, lapses: 0 };

const MIN_EASE = 1.3;
const MAX_INTERVAL_DAYS = 365;
/** "نسيتها" shows the card again in the same session (a few minutes later). */
const AGAIN_DELAY_MS = 10 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const round2 = (n: number) => Math.round(n * 100) / 100;

export function schedule(previous: SrsState | null, grade: Grade, now: Date): Scheduled {
  const s = previous ?? NEW_CARD;

  if (grade === "again") {
    return {
      ease: round2(Math.max(MIN_EASE, s.ease - 0.2)),
      intervalDays: 0,
      repetitions: 0,
      lapses: s.lapses + 1,
      dueAt: new Date(now.getTime() + AGAIN_DELAY_MS),
    };
  }

  let ease = s.ease;
  let interval: number;
  if (grade === "hard") {
    ease = Math.max(MIN_EASE, s.ease - 0.15);
    interval = s.repetitions === 0 ? 1 : Math.max(s.intervalDays + 1, Math.round(s.intervalDays * 1.2));
  } else {
    interval = s.repetitions === 0 ? 1 : s.repetitions === 1 ? 3 : Math.round(Math.max(1, s.intervalDays) * s.ease);
  }
  interval = Math.min(MAX_INTERVAL_DAYS, interval);

  return {
    ease: round2(ease),
    intervalDays: interval,
    repetitions: s.repetitions + 1,
    lapses: s.lapses,
    dueAt: new Date(now.getTime() + interval * DAY_MS),
  };
}

/** Arabic label for when the card comes back ("بعد 3 أيام"). */
export function nextReviewLabel(scheduled: Scheduled, now: Date): string {
  const days = Math.round((scheduled.dueAt.getTime() - now.getTime()) / DAY_MS);
  if (days <= 0) return "بعد دقائق";
  if (days === 1) return "غداً";
  if (days === 2) return "بعد يومين";
  if (days <= 10) return `بعد ${days} أيام`;
  return `بعد ${days} يوماً`;
}
