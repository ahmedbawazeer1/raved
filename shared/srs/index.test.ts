import { describe, expect, it } from "vitest";
import { NEW_CARD, nextReviewLabel, schedule } from "./index";

const now = new Date("2026-10-26T09:00:00Z");
const days = (d: Date) => Math.round((d.getTime() - now.getTime()) / 86_400_000);

describe("schedule", () => {
  it("a new word answered «أعرفها» comes back tomorrow, then in 3 days, then grows by ease", () => {
    const first = schedule(null, "good", now);
    expect(first.intervalDays).toBe(1);
    expect(days(first.dueAt)).toBe(1);
    const second = schedule(first, "good", now);
    expect(second.intervalDays).toBe(3);
    const third = schedule(second, "good", now);
    expect(third.intervalDays).toBe(8); // 3 × 2.5 rounded
    expect(third.repetitions).toBe(3);
    expect(third.ease).toBe(2.5);
  });

  it("«نسيتها» resets the word, lowers ease and shows it again within minutes", () => {
    const learned = schedule(schedule(null, "good", now), "good", now);
    const forgot = schedule(learned, "again", now);
    expect(forgot.repetitions).toBe(0);
    expect(forgot.intervalDays).toBe(0);
    expect(forgot.lapses).toBe(1);
    expect(forgot.ease).toBe(2.3);
    expect(forgot.dueAt.getTime() - now.getTime()).toBe(10 * 60 * 1000);
    expect(schedule(forgot, "good", now).intervalDays).toBe(1);
  });

  it("«صعبة» grows the interval slowly and lowers ease", () => {
    const base = { ...NEW_CARD, repetitions: 3, intervalDays: 10 };
    const hard = schedule(base, "hard", now);
    expect(hard.intervalDays).toBe(12);
    expect(hard.ease).toBe(2.35);
    expect(schedule({ ...NEW_CARD, repetitions: 2, intervalDays: 1 }, "hard", now).intervalDays).toBe(2);
  });

  it("never lets ease fall below 1.3 or intervals exceed a year", () => {
    let s = schedule(null, "again", now);
    for (let i = 0; i < 10; i++) s = schedule(s, "again", now);
    expect(s.ease).toBe(1.3);
    const big = schedule({ ease: 2.5, intervalDays: 300, repetitions: 9, lapses: 0 }, "good", now);
    expect(big.intervalDays).toBe(365);
  });
});

describe("nextReviewLabel", () => {
  it("speaks Arabic", () => {
    expect(nextReviewLabel(schedule(null, "again", now), now)).toBe("بعد دقائق");
    expect(nextReviewLabel(schedule(null, "good", now), now)).toBe("غداً");
    expect(nextReviewLabel({ ...NEW_CARD, dueAt: new Date(now.getTime() + 3 * 86_400_000) }, now)).toBe("بعد 3 أيام");
    expect(nextReviewLabel({ ...NEW_CARD, dueAt: new Date(now.getTime() + 20 * 86_400_000) }, now)).toBe("بعد 20 يوماً");
  });
});
