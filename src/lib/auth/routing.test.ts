import { describe, expect, it } from "vitest";
import { homePathFor, pickDestination, safeNextPath } from "./routing";

const base = { role: "student", status: "pending", birth_date: null, phone: null, school: null };
const step1Done = { ...base, birth_date: "2010-01-01", phone: "+967771234567", school: "مدرسة" };

describe("homePathFor", () => {
  it("sends admins to /admin", () => expect(homePathFor({ ...base, role: "admin", status: "active" }, null)).toBe("/admin"));
  it("sends active students to /student", () => expect(homePathFor({ ...base, status: "active" }, null)).toBe("/student"));
  it("new student starts at step 1", () => expect(homePathFor(base, null)).toBe("/apply"));
  it("step 1 done goes to step 2", () => expect(homePathFor(step1Done, { status: "draft" })).toBe("/apply/goal"));
  it("submitted goes to status", () => expect(homePathFor(step1Done, { status: "submitted" })).toBe("/apply/status"));
  it("needs changes goes to status", () => expect(homePathFor(step1Done, { status: "needs_changes" })).toBe("/apply/status"));
  it("suspended goes to status", () => expect(homePathFor({ ...step1Done, status: "suspended" }, null)).toBe("/apply/status"));
});

describe("safeNextPath", () => {
  it("keeps relative paths", () => expect(safeNextPath("/admin/paths")).toBe("/admin/paths"));
  it.each(["https://evil.com", "//evil.com", "/\\evil.com", "", null])("blocks %s", (v) => {
    expect(safeNextPath(v, "/x")).toBe("/x");
  });
});

describe("pickDestination", () => {
  it("keeps next inside own area", () => expect(pickDestination("/admin", "/admin/paths")).toBe("/admin/paths"));
  it("ignores next outside own area", () => expect(pickDestination("/apply", "/admin")).toBe("/apply"));
  it("ignores prefix tricks", () => expect(pickDestination("/admin", "/administrator")).toBe("/admin"));
  it("falls back to home", () => expect(pickDestination("/student", null)).toBe("/student"));
});
