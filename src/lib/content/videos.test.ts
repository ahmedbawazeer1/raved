import { describe, expect, it } from "vitest";
import { oembedStatus, videoIds } from "./videos";

describe("videoIds", () => {
  it("collects unique valid YouTube ids from lesson blocks", () => {
    expect(
      videoIds([
        { blocks: [{ type: "video", youtube_id: "dQw4w9WgXcQ" }, { type: "text", markdown_ar: "x" }] },
        { blocks: [{ type: "video", youtube_id: "dQw4w9WgXcQ" }, { type: "video", youtube_id: "bad id" }] },
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
