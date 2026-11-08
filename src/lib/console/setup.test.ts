import { describe, expect, it } from "vitest";
import { setupDone, setupSteps, type SetupState } from "./setup";

const empty: SetupState = { paths: 0, agentPaused: true, mapsStarted: 0, mapsApproved: 0, mapInReview: null, teachers: 0, unitsPublished: 0 };

describe("setupSteps", () => {
  it("starts with adding a path", () => {
    const steps = setupSteps(empty);
    expect(steps.find((s) => s.now)?.key).toBe("path");
    expect(setupDone(steps)).toBe(1);
  });

  it("points at the map waiting for approval", () => {
    const steps = setupSteps({ ...empty, paths: 1, agentPaused: false, mapsStarted: 1, mapInReview: "lvl-1" });
    const now = steps.find((s) => s.now)!;
    expect(now.key).toBe("approve");
    expect(now.href).toBe("/studio/levels/lvl-1");
  });

  it("never makes the teacher step the blocking one", () => {
    const steps = setupSteps({ ...empty, paths: 1, agentPaused: false, mapsStarted: 1, mapsApproved: 1 });
    expect(steps.find((s) => s.now)?.key).toBe("publish");
    expect(steps.find((s) => s.key === "teacher")?.done).toBe(false);
  });

  it("is complete when everything is done", () => {
    const steps = setupSteps({ paths: 1, agentPaused: false, mapsStarted: 1, mapsApproved: 1, mapInReview: null, teachers: 1, unitsPublished: 1 });
    expect(steps.some((s) => s.now)).toBe(false);
    expect(setupDone(steps)).toBe(steps.length);
  });
});
