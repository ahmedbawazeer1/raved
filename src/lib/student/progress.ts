/** Pure progress logic for the curriculum and today's session (unit tested). */
export interface UnitInput {
  id: string;
  code: string;
  title: string;
  position: number;
  levelCode: string;
  levelPosition: number;
  sizeBytes: number | null;
  quizId: string | null;
  /** Stop on the journey map (e.g. «المكلا»). */
  stop?: string | null;
  lessons: { id: string; position: number; title: string; skill: string; estMinutes: number | null }[];
}

export interface ProgressInput {
  completedLessonIds: Set<string>;
  passedQuizIds: Set<string>;
  /** Set by the placement test: earlier units stay "open" (optional review), not required. */
  startUnitId?: string | null;
}

export type UnitState = "done" | "now" | "open" | "locked";

export interface UnitView extends UnitInput {
  state: UnitState;
  lessonsDone: number;
  quizPassed: boolean;
}

/**
 * Orders units (level, then unit) and assigns states: units whose quiz is passed are "done",
 * the first unfinished unit (from the placement start unit on) is "now", the ones after it
 * are "locked", and unfinished ones before the start unit are "open".
 */
export function buildCurriculum(units: UnitInput[], progress: ProgressInput): UnitView[] {
  const ordered = [...units].sort((a, b) => a.levelPosition - b.levelPosition || a.position - b.position);
  const startIndex = Math.max(0, ordered.findIndex((u) => u.id === progress.startUnitId));
  let foundNow = false;
  return ordered.map((u, i) => {
    const lessonsDone = u.lessons.filter((l) => progress.completedLessonIds.has(l.id)).length;
    const quizPassed = u.quizId ? progress.passedQuizIds.has(u.quizId) : lessonsDone === u.lessons.length && u.lessons.length > 0;
    let state: UnitState;
    if (quizPassed) state = "done";
    else if (i < startIndex) state = "open";
    else if (!foundNow) {
      state = "now";
      foundNow = true;
    } else state = "locked";
    return { ...u, state, lessonsDone, quizPassed };
  });
}

export type NextStep =
  | { kind: "lesson"; unit: UnitView; lessonId: string; title: string; index: number }
  | { kind: "quiz"; unit: UnitView; quizId: string }
  | { kind: "finished" }
  | { kind: "empty" };

/** The single next activity for "جلسة اليوم". */
export function nextStep(curriculum: UnitView[], progress: ProgressInput): NextStep {
  if (curriculum.length === 0) return { kind: "empty" };
  const unit = curriculum.find((u) => u.state === "now");
  if (!unit) return { kind: "finished" };
  const lessons = [...unit.lessons].sort((a, b) => a.position - b.position);
  const index = lessons.findIndex((l) => !progress.completedLessonIds.has(l.id));
  if (index >= 0) return { kind: "lesson", unit, lessonId: lessons[index].id, title: lessons[index].title, index };
  if (unit.quizId) return { kind: "quiz", unit, quizId: unit.quizId };
  return { kind: "finished" };
}
