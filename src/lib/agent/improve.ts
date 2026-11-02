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
