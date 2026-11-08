import { describe, expect, it } from "vitest";
import { buildCurriculum, nextStep, type UnitInput } from "./progress";

const unit = (id: string, position: number, levelPosition = 1, lessons = 2): UnitInput => ({
  id,
  code: `A1-0${position}`,
  title: id,
  position,
  levelCode: "A1",
  levelPosition,
  sizeBytes: 1000,
  quizId: `q-${id}`,
  lessons: Array.from({ length: lessons }, (_, i) => ({ id: `${id}-l${i + 1}`, position: i + 1, title: `L${i + 1}`, skill: "grammar", estMinutes: 10 })),
});

describe("buildCurriculum", () => {
  it("marks passed units done, first open as now, rest locked", () => {
    const c = buildCurriculum([unit("u3", 3), unit("u1", 1), unit("u2", 2)], {
      completedLessonIds: new Set(["u1-l1", "u1-l2", "u2-l1"]),
      passedQuizIds: new Set(["q-u1"]),
    });
    expect(c.map((u) => [u.id, u.state, u.lessonsDone])).toEqual([
      ["u1", "done", 2],
      ["u2", "now", 1],
      ["u3", "locked", 0],
    ]);
  });

  it("starts at the placement unit; earlier units stay open for review", () => {
    const c = buildCurriculum([unit("u1", 1), unit("u2", 2), unit("u3", 3)], {
      completedLessonIds: new Set(),
      passedQuizIds: new Set(),
      startUnitId: "u2",
    });
    expect(c.map((u) => u.state)).toEqual(["open", "now", "locked"]);
    expect(nextStep(c, { completedLessonIds: new Set(), passedQuizIds: new Set() })).toMatchObject({ kind: "lesson", lessonId: "u2-l1" });
  });

  it("ignores an unknown start unit", () => {
    const c = buildCurriculum([unit("u1", 1)], { completedLessonIds: new Set(), passedQuizIds: new Set(), startUnitId: "gone" });
    expect(c[0].state).toBe("now");
  });

  it("orders by level then unit", () => {
    const c = buildCurriculum([unit("b", 1, 2), unit("a", 2, 1)], { completedLessonIds: new Set(), passedQuizIds: new Set() });
    expect(c.map((u) => u.id)).toEqual(["a", "b"]);
  });
});

describe("nextStep", () => {
  it("returns the first unfinished lesson of the current unit", () => {
    const progress = { completedLessonIds: new Set(["u1-l1"]), passedQuizIds: new Set<string>() };
    const s = nextStep(buildCurriculum([unit("u1", 1)], progress), progress);
    expect(s).toMatchObject({ kind: "lesson", lessonId: "u1-l2", index: 1 });
  });

  it("returns the quiz when all lessons are done", () => {
    const progress = { completedLessonIds: new Set(["u1-l1", "u1-l2"]), passedQuizIds: new Set<string>() };
    expect(nextStep(buildCurriculum([unit("u1", 1)], progress), progress)).toMatchObject({ kind: "quiz", quizId: "q-u1" });
  });

  it("handles finished and empty curricula", () => {
    const progress = { completedLessonIds: new Set(["u1-l1", "u1-l2"]), passedQuizIds: new Set(["q-u1"]) };
    expect(nextStep(buildCurriculum([unit("u1", 1)], progress), progress).kind).toBe("finished");
    expect(nextStep([], progress).kind).toBe("empty");
  });
});
