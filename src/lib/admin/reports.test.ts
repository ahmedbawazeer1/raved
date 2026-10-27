import { describe, expect, it } from "vitest";
import { dropOffLessons, weeklyActive, weekStart } from "./reports";

describe("weekStart", () => {
  it("starts weeks on Saturday", () => {
    expect(weekStart("2026-10-24T10:00:00Z")).toBe("2026-10-24"); // Saturday
    expect(weekStart("2026-10-27T10:00:00Z")).toBe("2026-10-24"); // Tuesday
    expect(weekStart("2026-10-30T23:00:00Z")).toBe("2026-10-24"); // Friday
  });
});

describe("weeklyActive", () => {
  it("counts distinct students per week, including empty weeks", () => {
    const now = new Date("2026-10-27T10:00:00Z");
    const rows = weeklyActive(
      [
        { student: "a", at: "2026-10-25T10:00:00Z" },
        { student: "a", at: "2026-10-26T10:00:00Z" },
        { student: "b", at: "2026-10-26T10:00:00Z" },
        { student: "a", at: "2026-10-12T10:00:00Z" },
        { student: "c", at: null },
      ],
      3,
      now,
    );
    expect(rows).toEqual([
      { week: "2026-10-10", students: 1 },
      { week: "2026-10-17", students: 0 },
      { week: "2026-10-24", students: 2 },
    ]);
  });
});

describe("dropOffLessons", () => {
  it("finds where students stop", () => {
    const lessons = [
      { id: "l1", title: "1" },
      { id: "l2", title: "2" },
      { id: "l3", title: "3" },
    ];
    const done = new Map([
      ["l1", new Set(["a", "b", "c", "d"])],
      ["l2", new Set(["a", "b", "c"])],
      ["l3", new Set(["a"])],
    ]);
    expect(dropOffLessons(lessons, done)).toEqual([
      { lessonId: "l3", title: "3", reached: 3, completed: 1 },
      { lessonId: "l2", title: "2", reached: 4, completed: 3 },
    ]);
  });
});
