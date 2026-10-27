/** Pure helpers for the progress page (unit tested). */

/** Calendar day in Yemen for a timestamp. */
export function yemenDate(iso: string | Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Aden", year: "numeric", month: "2-digit", day: "2-digit" }).format(
    typeof iso === "string" ? new Date(iso) : iso,
  );
}

function prevDay(day: string): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Days in a row with any study activity, ending today, or yesterday (today's session may
 * still be ahead), in Yemen time.
 */
export function streakDays(activity: (string | null | undefined)[], now: Date = new Date()): number {
  const days = new Set(activity.filter((a): a is string => Boolean(a)).map((a) => yemenDate(a)));
  const today = yemenDate(now);
  let day = days.has(today) ? today : prevDay(today);
  let count = 0;
  while (days.has(day)) {
    count += 1;
    day = prevDay(day);
  }
  return count;
}

export const CEFR_ORDER = ["A1", "A1+", "A2", "A2+", "B1", "B1+", "B2", "B2+"] as const;

/** Exam track opens at B1+ (PRD 8.10). */
export function examTrackOpen(level: string | null | undefined): boolean {
  const i = CEFR_ORDER.indexOf((level ?? "") as (typeof CEFR_ORDER)[number]);
  return i >= CEFR_ORDER.indexOf("B1+");
}
