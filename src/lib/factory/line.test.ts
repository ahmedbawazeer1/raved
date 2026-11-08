import { describe, expect, it } from "vitest";
import { stationOf } from "./line";

describe("stationOf", () => {
  it("follows the unit through the line", () => {
    expect(stationOf({ build_status: "planned", teacher_ok_at: null })).toBe("planned");
    expect(stationOf({ build_status: "building", teacher_ok_at: null }, "videos")).toBe("video");
    expect(stationOf({ build_status: "building", teacher_ok_at: null }, "lessons")).toBe("write");
    expect(stationOf({ build_status: "building", teacher_ok_at: null }, "critic")).toBe("qa");
    expect(stationOf({ build_status: "review", teacher_ok_at: null })).toBe("teacher");
    expect(stationOf({ build_status: "review", teacher_ok_at: "2026-11-08" })).toBe("admin");
    expect(stationOf({ build_status: "approved", teacher_ok_at: null })).toBe("published");
    expect(stationOf({ build_status: "failed", teacher_ok_at: null })).toBe("failed");
  });

  it("puts a queued build (no step yet) at the first factory station", () => {
    expect(stationOf({ build_status: "building", teacher_ok_at: null }, null)).toBe("video");
    expect(stationOf({ build_status: "building", teacher_ok_at: null }, "waiting")).toBe("video");
  });
});
