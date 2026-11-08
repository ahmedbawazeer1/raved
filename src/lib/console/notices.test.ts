import { describe, expect, it } from "vitest";
import { noticesFor, reviewCount, type ConsoleSummary } from "./notices";

const base: Omit<ConsoleSummary, "notices"> = {
  isAdmin: true,
  pendingApplications: 0,
  openReports: 0,
  openErrors: 0,
  brokenVideos: 0,
  unitsForTeacher: [],
  unitsForAdmin: [],
  mapsInReview: [],
  agent: { kind: "idle" },
};

describe("noticesFor", () => {
  it("is empty when nothing waits", () => {
    expect(noticesFor(base)).toEqual([]);
  });

  it("shows the admin only units the teacher already reviewed, first", () => {
    const n = noticesFor({
      ...base,
      pendingApplications: 3,
      unitsForAdmin: [
        { id: "a", code: "A1-04", title: "البيت", teacherOk: true },
        { id: "b", code: "A1-05", title: "العمل", teacherOk: false },
      ],
    });
    expect(n.map((x) => x.id)).toEqual(["ua", "apps"]);
    expect(n[0]!.href).toBe("/studio/units/a");
  });

  it("gives the teacher their review work and no admin items", () => {
    const n = noticesFor({
      ...base,
      isAdmin: false,
      pendingApplications: 5,
      openReports: 2,
      unitsForTeacher: [{ id: "b", code: "A1-05", title: "العمل" }],
      mapsInReview: [{ levelId: "l1", code: "A2", teacherOk: false }],
    });
    expect(n.map((x) => x.id)).toEqual(["ub", "ml1"]);
  });

  it("reports an agent failure", () => {
    const n = noticesFor({ ...base, agent: { kind: "failed", label: "بناء وحدة A1-05", error: "429", at: "" } });
    expect(n[0]).toMatchObject({ tone: "red", href: "/admin/agent" });
  });
});

describe("reviewCount", () => {
  it("counts per role", () => {
    const s: ConsoleSummary = {
      ...base,
      notices: [],
      unitsForTeacher: [{ id: "b", code: "A1-05", title: "" }],
      unitsForAdmin: [
        { id: "a", code: "A1-04", title: "", teacherOk: true },
        { id: "b", code: "A1-05", title: "", teacherOk: false },
      ],
      mapsInReview: [{ levelId: "l", code: "A2", teacherOk: true }],
    };
    expect(reviewCount(s)).toBe(2);
    expect(reviewCount({ ...s, isAdmin: false })).toBe(1);
  });
});
