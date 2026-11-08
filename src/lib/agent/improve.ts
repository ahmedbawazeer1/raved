/**
 * Self-improvement (unit tested): from anonymous, aggregated quiz results and lesson ratings the
 * agent finds the weak parts of a unit and proposes a better version for the owner's review.
 * Only counts and question texts are used; never a student's identity or answers text.
 */
export interface QuestionStat {
  id: string;
  prompt: string;
  attempts: number;
  correctRate: number;
}

export interface UnitStats {
  attempts: number;
  passRate: number;
  questions: QuestionStat[];
  lessonsNotUseful: { lesson: string; share: number; votes: number }[];
}

type ResultItem = { id?: unknown; prompt?: unknown; correct?: unknown };

export function questionStats(attempts: { results: unknown; passed: boolean }[]): Pick<UnitStats, "attempts" | "passRate" | "questions"> {
  const byId = new Map<string, { prompt: string; n: number; ok: number }>();
  for (const a of attempts) {
    for (const r of Array.isArray(a.results) ? (a.results as ResultItem[]) : []) {
      if (typeof r.id !== "string") continue;
      const s = byId.get(r.id) ?? { prompt: typeof r.prompt === "string" ? r.prompt : "", n: 0, ok: 0 };
      s.n += 1;
      if (r.correct === true) s.ok += 1;
      byId.set(r.id, s);
    }
  }
  return {
    attempts: attempts.length,
    passRate: attempts.length ? attempts.filter((a) => a.passed).length / attempts.length : 0,
    questions: [...byId.entries()].map(([id, s]) => ({ id, prompt: s.prompt, attempts: s.n, correctRate: s.ok / s.n })),
  };
}

/** A unit needs work when enough students tried it and some questions or lessons clearly fail them. */
export function needsImprovement(stats: UnitStats, minAttempts = 5): boolean {
  if (stats.attempts < minAttempts) return false;
  return stats.passRate < 0.6 || weakQuestions(stats).length > 0 || stats.lessonsNotUseful.some((l) => l.votes >= 5 && l.share >= 0.4);
}

export function weakQuestions(stats: UnitStats, threshold = 0.4): QuestionStat[] {
  return stats.questions.filter((q) => q.attempts >= 5 && q.correctRate < threshold).sort((a, b) => a.correctRate - b.correctRate);
}

export function improvePrompt(pkg: unknown, stats: UnitStats, schema: string): string {
  const weak = weakQuestions(stats);
  return `Improve this published Raved unit using what students struggled with.
Results: ${stats.attempts} quiz attempts, pass rate ${Math.round(stats.passRate * 100)}%.
Questions most students got wrong:
${weak.map((q) => `- ${q.id} (${Math.round(q.correctRate * 100)}% correct): ${q.prompt}`).join("\n") || "- none"}
Lessons many students marked «not useful»:
${stats.lessonsNotUseful.map((l) => `- ${l.lesson} (${Math.round(l.share * 100)}% of ${l.votes})`).join("\n") || "- none"}

Find the cause in the lessons (missing explanation, too few exercises on that point, a confusing question, a level jump)
and fix it: clearer Arabic explanation, more practice on the weak point before the quiz, clearer or fairer questions.
Keep the same video, story, stop and ids (add new ids only for new items). Return the whole improved package JSON,
following this schema:
${schema}

Current package:
${JSON.stringify(pkg)}`;
}

// ---------------------------------------------------------------------------------------------
// Item analysis (content factory, weekly): difficulty and discrimination of every quiz question.
// ---------------------------------------------------------------------------------------------

export type ItemFlag = "miskeyed" | "too_easy" | "too_hard" | "weak";

export interface ItemStat {
  id: string;
  prompt: string;
  attempts: number;
  /** Share of students who answered right (difficulty index). */
  p: number;
  /** Right-rate of the top 27% (by quiz score) minus that of the bottom 27%. */
  discrimination: number;
  flag: ItemFlag | null;
}

export const ITEM_FLAG_AR: Record<ItemFlag, string> = {
  miskeyed: "المتفوقون يخطئون فيه أكثر من غيرهم: غالباً الإجابة المعتمدة خطأ أو السؤال غامض",
  too_easy: "سهل جداً: يجيبه الجميع، والخيارات الخاطئة واضحة",
  too_hard: "صعب جداً: أغلب الطلاب يخطئون فيه",
  weak: "لا يميّز بين من فهم ومن لم يفهم",
};

/** Needs at least `min` attempts per question before flagging anything (small groups mislead). */
export function itemAnalysis(attempts: { results: unknown; correct: number }[], min = 10): ItemStat[] {
  const sorted = [...attempts].sort((a, b) => b.correct - a.correct);
  const k = Math.max(1, Math.round(sorted.length * 0.27));
  const upper = new Set(sorted.slice(0, k));
  const lower = new Set(sorted.slice(-k));
  const byId = new Map<string, { prompt: string; n: number; ok: number; up: number; upOk: number; low: number; lowOk: number }>();
  for (const a of sorted) {
    for (const r of Array.isArray(a.results) ? (a.results as { id?: unknown; prompt?: unknown; correct?: unknown }[]) : []) {
      if (typeof r.id !== "string") continue;
      const s = byId.get(r.id) ?? { prompt: typeof r.prompt === "string" ? r.prompt : "", n: 0, ok: 0, up: 0, upOk: 0, low: 0, lowOk: 0 };
      const ok = r.correct === true ? 1 : 0;
      s.n++;
      s.ok += ok;
      if (upper.has(a)) {
        s.up++;
        s.upOk += ok;
      }
      if (lower.has(a)) {
        s.low++;
        s.lowOk += ok;
      }
      byId.set(r.id, s);
    }
  }
  return [...byId.entries()].map(([id, s]) => {
    const p = s.n ? s.ok / s.n : 0;
    const d = (s.up ? s.upOk / s.up : 0) - (s.low ? s.lowOk / s.low : 0);
    const round = (x: number) => Math.round(x * 100) / 100;
    let flag: ItemFlag | null = null;
    if (s.n >= min) {
      if (d < 0) flag = "miskeyed";
      else if (p > 0.95) flag = "too_easy";
      else if (p < 0.25) flag = "too_hard";
      else if (d < 0.2) flag = "weak";
    }
    return { id, prompt: s.prompt, attempts: s.n, p: round(p), discrimination: round(d), flag };
  });
}

/** The note the factory gets when the owner sends a unit back for improvement. */
export function improvementNote(items: ItemStat[], lessonsNotUseful: { lesson: string; share: number; votes: number }[]): string {
  const parts = items.filter((i) => i.flag).map((i) => `quiz question "${i.prompt}": ${ITEM_FLAG_AR[i.flag!]}`);
  for (const l of lessonsNotUseful.filter((x) => x.votes >= 5 && x.share >= 0.3))
    parts.push(`lesson «${l.lesson}»: ${Math.round(l.share * 100)}% of students rated it not useful`);
  return parts.join(" | ").slice(0, 1000);
}
