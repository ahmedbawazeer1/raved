import { describe, expect, it } from "vitest";
import { buildAheadOn, pickNextUnit, type UnitRow } from "./next-unit";

const u = (position: number, build_status: string): UnitRow => ({ id: `u${position}`, code: `A1-0${position}`, position, build_status });

describe("pickNextUnit", () => {
  it("starts with the first unit", () => {
    expect(pickNextUnit([u(2, "planned"), u(1, "planned")], true)?.code).toBe("A1-01");
  });

  it("never builds two units at once", () => {
    expect(pickNextUnit([u(1, "building"), u(2, "planned")], true)).toBeNull();
  });

  it("builds one ahead while one waits for review", () => {
    expect(pickNextUnit([u(1, "approved"), u(2, "review"), u(3, "planned")], true)?.code).toBe("A1-03");
  });

  it("waits when two units are already in review", () => {
    expect(pickNextUnit([u(1, "review"), u(2, "review"), u(3, "planned")], true)).toBeNull();
  });

  it("keeps the one-by-one rule when build-ahead is off", () => {
    expect(pickNextUnit([u(1, "review"), u(2, "planned")], false)).toBeNull();
    expect(pickNextUnit([u(1, "approved"), u(2, "planned")], false)?.code).toBe("A1-02");
  });

  it("retries a failed unit before going on", () => {
    expect(pickNextUnit([u(1, "approved"), u(2, "failed"), u(3, "planned")], true)?.code).toBe("A1-02");
  });

  it("has nothing to do when everything is published", () => {
    expect(pickNextUnit([u(1, "approved"), u(2, "approved")], true)).toBeNull();
  });
});

describe("buildAheadOn", () => {
  it("is on unless turned off", () => {
    expect(buildAheadOn(undefined)).toBe(true);
    expect(buildAheadOn(true)).toBe(true);
    expect(buildAheadOn(false)).toBe(false);
  });
});
