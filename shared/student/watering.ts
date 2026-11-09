/**
 * «السقاية» (replaces the streak): every day with a lesson, quiz or review waters Rafed.
 * Friday is a rest day: it never breaks the run (and counts if the student studied anyway).
 * Days are Yemen days (Asia/Aden).
 */
import { yemenDate } from "./stats";

/** yyyy-mm-dd of the day before. */
function prev(day: string): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}
/** 5 = Friday. */
const weekday = (day: string) => new Date(`${day}T12:00:00Z`).getUTCDay();
export const isFriday = (day: string) => weekday(day) === 5;

export type WateringState = "watered" | "waiting" | "thirsty" | "rest" | "new";

export interface Watering {
  /** Days in the current run (Fridays without study do not count, and do not break it). */
  days: number;
  state: WateringState;
  /** The current Saturday→Friday week: true when watered (index 0 = Saturday). */
  week: boolean[];
  /** Index of today in `week`. */
  todayIndex: number;
}

export function watering(activity: (string | null | undefined)[], now: Date = new Date()): Watering {
  const days = new Set(activity.filter((a): a is string => Boolean(a)).map((a) => yemenDate(a)));
  const today = yemenDate(now);
  // Walk back from today (or yesterday if today isn't watered yet), skipping unwatered Fridays.
  let day = days.has(today) ? today : prev(today);
  let count = 0;
  for (;;) {
    if (days.has(day)) count += 1;
    else if (!isFriday(day)) break;
    day = prev(day);
    if (count > 3660) break;
  }
  let state: WateringState;
  if (days.has(today)) state = "watered";
  else if (isFriday(today)) state = "rest";
  else if (count > 0) state = "waiting";
  else state = days.size ? "thirsty" : "new";
  // This week, Saturday (index 0) → Friday (6).
  const todayIndex = (weekday(today) + 1) % 7;
  const week: boolean[] = [];
  let d = today;
  for (let i = todayIndex; i >= 0; i--) {
    week[i] = days.has(d);
    d = prev(d);
  }
  for (let i = todayIndex + 1; i < 7; i++) week[i] = false;
  return { days: count, state, week, todayIndex };
}
