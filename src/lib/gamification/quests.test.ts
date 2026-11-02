import { describe, expect, it } from "vitest";
import { dailyQuests } from "./quests";

const now = new Date("2026-11-02T10:00:00Z");

describe("dailyQuests", () => {
  it("marks quests done from today's events only (Aden time)", () => {
    const q = dailyQuests(
      [
        { kind: "lesson", created_at: "2026-11-02T06:00:00Z" },
        { kind: "vocab", created_at: "2026-11-01T08:00:00Z" },
        { kind: "duel", created_at: "2026-11-02T09:00:00Z" },
      ],
      { vocab: true },
      now,
    );
    expect(q.map((x) => [x.key, x.done])).toEqual([
      ["lesson", true],
      ["vocab", false],
      ["game", true],
    ]);
  });

  it("drops the vocabulary quest when the path has no vocabulary", () => {
    expect(dailyQuests([], { vocab: false }, now).map((x) => x.key)).toEqual(["lesson", "game"]);
  });
});
