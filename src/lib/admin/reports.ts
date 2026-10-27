/** Pure report helpers for /admin/reports (unit tested). */

/** ISO timestamp `days` days before now (kept out of components so they stay pure). */
export function daysAgoIso(days: number, now = new Date()): string {
  return new Date(now.getTime() - days * 86_400_000).toISOString();
}

/** Saturday that starts the week (Yemen's school week) of a date, as YYYY-MM-DD. */
export function weekStart(iso: string): string {
  const d = new Date(iso);
  const day = d.getUTCDay(); // 0 Sunday … 6 Saturday
  d.setUTCDate(d.getUTCDate() - ((day + 1) % 7));
  return d.toISOString().slice(0, 10);
}

/** Distinct active students per week, for the last `weeks` weeks (oldest first, empty weeks included). */
export function weeklyActive(events: { student: string; at: string | null }[], weeks: number, now: Date): { week: string; students: number }[] {
  const byWeek = new Map<string, Set<string>>();
  for (const e of events) {
    if (!e.at) continue;
    const w = weekStart(e.at);
    if (!byWeek.has(w)) byWeek.set(w, new Set());
    byWeek.get(w)!.add(e.student);
  }
  const out: { week: string; students: number }[] = [];
  const current = new Date(`${weekStart(now.toISOString())}T00:00:00Z`);
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(current);
    d.setUTCDate(d.getUTCDate() - 7 * i);
    const w = d.toISOString().slice(0, 10);
    out.push({ week: w, students: byWeek.get(w)?.size ?? 0 });
  }
  return out;
}

export interface DropOff {
  lessonId: string;
  title: string;
  /** students who finished the previous lesson */
  reached: number;
  /** of those, how many finished this one */
  completed: number;
}

/**
 * Lessons where students stop: among those who finished the previous lesson (in curriculum
 * order), how many did not finish this one. Biggest losses first.
 */
export function dropOffLessons(ordered: { id: string; title: string }[], completions: Map<string, Set<string>>, top = 5): DropOff[] {
  const out: DropOff[] = [];
  for (let i = 1; i < ordered.length; i++) {
    const prev = completions.get(ordered[i - 1].id) ?? new Set<string>();
    if (prev.size === 0) continue;
    const here = completions.get(ordered[i].id) ?? new Set<string>();
    const completed = [...prev].filter((s) => here.has(s)).length;
    if (completed < prev.size) out.push({ lessonId: ordered[i].id, title: ordered[i].title, reached: prev.size, completed });
  }
  return out.sort((a, b) => b.reached - b.completed - (a.reached - a.completed)).slice(0, top);
}
