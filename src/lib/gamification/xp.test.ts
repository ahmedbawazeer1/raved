import { describe, expect, it } from "vitest";
import { badges, playerLevel, statsFromXp, xpForLevel } from "./xp";

describe("player levels", () => {
  it("needs 50 more points for each next level", () => {
    expect([1, 2, 3, 4, 5].map(xpForLevel)).toEqual([0, 50, 150, 300, 500]);
  });

  it("finds the level and the progress inside it", () => {
    expect(playerLevel(0)).toEqual({ level: 1, into: 0, span: 50 });
    expect(playerLevel(49).level).toBe(1);
    expect(playerLevel(50)).toEqual({ level: 2, into: 0, span: 100 });
    expect(playerLevel(320)).toEqual({ level: 4, into: 20, span: 200 });
  });
});

describe("badges", () => {
  const rows = [
    { kind: "lesson", points: 10 },
    { kind: "lesson", points: 10 },
    { kind: "video", points: 5 },
    { kind: "quiz", points: 20 },
    { kind: "quiz_perfect", points: 10 },
  ];

  it("counts stats from point rows", () => {
    expect(statsFromXp(rows, 3)).toMatchObject({ xp: 55, lessons: 2, unitsPassed: 1, perfectQuizzes: 1, videos: 1, streak: 3 });
  });

  it("marks earned badges and partial progress", () => {
    const list = badges(statsFromXp(rows, 3));
    const byId = Object.fromEntries(list.map((b) => [b.id, b]));
    expect(byId["first-step"].earned).toBe(true);
    expect(byId["mukalla-ambassador"].earned).toBe(true);
    expect(byId["full-mark"].earned).toBe(true);
    expect(byId["doan-bee"].earned).toBe(false);
    expect(byId["doan-bee"].progress).toBeCloseTo(3 / 7);
    expect(byId["shibam-builder"].progress).toBeCloseTo(0.2);
  });
});
