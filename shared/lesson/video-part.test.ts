import { describe, expect, it } from "vitest";
import { isVideoPart, progressByKey, videoKey } from "./video-part";

describe("video parts", () => {
  it("keys parts by start second and whole videos by id", () => {
    expect(isVideoPart({ end_sec: 120 })).toBe(true);
    expect(isVideoPart({})).toBe(false);
    expect(videoKey({ youtube_id: "abc", start_sec: 60, end_sec: 120 })).toBe("abc@60");
    expect(videoKey({ youtube_id: "abc", end_sec: 120 })).toBe("abc@0");
    expect(videoKey({ youtube_id: "abc" })).toBe("abc");
  });

  it("merges whole and part progress", () => {
    const p = progressByKey(
      [{ youtube_id: "abc", watched_sec: 10, duration_sec: 100, completed_at: null }],
      [{ youtube_id: "abc", start_sec: 60, watched_sec: 50, duration_sec: 60, completed_at: "now" }],
    );
    expect(p.abc.done).toBe(false);
    expect(p["abc@60"]).toEqual({ watched: 50, duration: 60, done: true });
  });
});
