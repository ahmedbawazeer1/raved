import { describe, expect, it } from "vitest";
import { addSecond, parseRanges, videoDone, watchedPercent, watchedSeconds, type WatchRanges } from "./watch";

const play = (ranges: WatchRanges, from: number, to: number) => {
  let r = ranges;
  for (let s = from; s < to; s++) r = addSecond(r, s);
  return r;
};

describe("watched seconds", () => {
  it("counts continuous playback once", () => {
    const r = play([], 0, 10);
    expect(r).toEqual([[0, 10]]);
    expect(watchedSeconds(play(r, 0, 10))).toBe(10);
  });

  it("does not count skipped parts and merges ranges", () => {
    let r = play([], 0, 5);
    r = play(r, 50, 55);
    expect(watchedSeconds(r)).toBe(10);
    r = play(r, 5, 50);
    expect(r).toEqual([[0, 55]]);
  });

  it("handles seconds before existing ranges", () => {
    const r = addSecond(addSecond([[10, 20]], 3), 9);
    expect(r).toEqual([[3, 4], [9, 20]]);
  });

  it("applies the 80% rule like the server", () => {
    expect(videoDone(79, 100)).toBe(false);
    expect(videoDone(80, 100)).toBe(true);
    expect(watchedPercent(50, 200)).toBe(25);
  });

  it("reads stored ranges safely", () => {
    expect(parseRanges("[[0,5]]")).toEqual([[0, 5]]);
    expect(parseRanges("oops")).toEqual([]);
    expect(parseRanges(null)).toEqual([]);
  });
});
