/** Today's three small quests, completed from the student's point events (unit tested). */
import { yemenDate } from "../student/stats";

export interface Quest {
  key: string;
  label: string;
  href: string;
  done: boolean;
}

const QUESTS: { key: string; kinds: string[]; label: string; href: string }[] = [
  { key: "lesson", kinds: ["lesson"], label: "أكمل درساً", href: "/student" },
  { key: "vocab", kinds: ["vocab"], label: "راجع مفرداتك", href: "/student/vocab" },
  { key: "game", kinds: ["game", "duel", "story", "roleplay"], label: "العب لعبة أو تحدَّ صديقاً", href: "/student/practice/games" },
];

export function dailyQuests(rows: { kind: string; created_at: string }[], features: { vocab: boolean }, now: Date = new Date()): Quest[] {
  const today = yemenDate(now);
  const kindsToday = new Set(rows.filter((r) => yemenDate(r.created_at) === today).map((r) => r.kind));
  return QUESTS.filter((q) => q.key !== "vocab" || features.vocab).map((q) => ({
    key: q.key,
    label: q.label,
    href: q.href,
    done: q.kinds.some((k) => kindsToday.has(k)),
  }));
}
