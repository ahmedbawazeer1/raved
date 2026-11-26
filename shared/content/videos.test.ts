import { describe, expect, it } from "vitest";
import { oembedStatus, videoIds } from "./videos";

describe("videoIds", () => {
  it("collects unique valid YouTube ids from lesson blocks", () => {
    expect(
      videoIds([
        {
          blocks: [
            { type: "video", youtube_id: "dQw4w9WgXcQ" },
            { type: "text", markdown_ar: "x" },
          ],
        },
        {
          blocks: [
            { type: "video", youtube_id: "dQw4w9WgXcQ" },
            { type: "video", youtube_id: "bad id" },
          ],
        },
        { blocks: null },
      ]),
    ).toEqual(["dQw4w9WgXcQ"]);
  });
});

describe("oembedStatus", () => {
  it("maps HTTP answers", () => {
    expect(oembedStatus(200)).toBe("ok");
    expect(oembedStatus(404)).toBe("broken");
    expect(oembedStatus(401)).toBe("broken");
    expect(oembedStatus(503)).toBe("unknown");
  });
});

import { isNativeVideoUrl } from "./videos";

describe("native video files", () => {
  it("allows only https mp4 files on the VOA host", () => {
    expect(isNativeVideoUrl("https://voa-video.voanews.eu/pangeavideo/2021/02/4/42/x_480p.mp4")).toBe(true);
    expect(isNativeVideoUrl("http://voa-video.voanews.eu/a.mp4")).toBe(false);
    expect(isNativeVideoUrl("https://evil.example.com/a.mp4")).toBe(false);
    expect(isNativeVideoUrl("https://voa-video.voanews.eu/a.html")).toBe(false);
    expect(isNativeVideoUrl(undefined)).toBe(false);
  });
  it("does not send native videos to the YouTube checker", () => {
    expect(videoIds([{ blocks: [{ type: "video", youtube_id: "voa_5781390", video_url: "https://voa-video.voanews.eu/a.mp4" }] }])).toEqual([]);
  });
});
