import { describe, expect, it } from "vitest";
import example from "../../../content/examples/A1-01.json";
import { validateUnitPackage } from "./validate";

const clone = () => JSON.parse(JSON.stringify(example));

describe("validateUnitPackage", () => {
  it("accepts the example unit (with warnings for the placeholder video and short quiz)", () => {
    const r = validateUnitPackage(clone(), { fileName: "A1-01.json" });
    expect(r.errors).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.warnings.some((w) => w.message.includes("needs_check"))).toBe(true);
  });

  it("reports schema errors in Arabic", () => {
    const pkg = clone();
    delete pkg.title;
    const r = validateUnitPackage(pkg);
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toContain("title");
  });

  it("rejects duplicate ids", () => {
    const pkg = clone();
    pkg.quiz.questions[1].id = pkg.quiz.questions[0].id;
    expect(validateUnitPackage(pkg).errors.some((e) => e.message.includes("مكرر"))).toBe(true);
  });

  it("rejects an mcq answer outside its options and duplicate options", () => {
    const pkg = clone();
    pkg.quiz.questions[0].answer = 5;
    pkg.quiz.questions[1].options = ["is", "is", "are"];
    const r = validateUnitPackage(pkg);
    expect(r.errors.some((e) => e.path === "quiz.questions[0].answer")).toBe(true);
    expect(r.errors.some((e) => e.path === "quiz.questions[1].options")).toBe(true);
  });

  it("requires videos to be optional", () => {
    const pkg = clone();
    pkg.lessons[0].blocks[3].optional = false;
    expect(validateUnitPackage(pkg).errors.some((e) => e.path.endsWith(".optional"))).toBe(true);
  });

  it("rejects too few vocabulary items", () => {
    const pkg = clone();
    pkg.vocab = pkg.vocab.slice(0, 5);
    expect(validateUnitPackage(pkg).ok).toBe(false);
  });

  it("checks the file name and package size", () => {
    expect(validateUnitPackage(clone(), { fileName: "A1-02.json" }).errors.some((e) => e.path === "code")).toBe(true);
    const big = clone();
    big.context_note = "x".repeat(2.2 * 1024 * 1024);
    expect(validateUnitPackage(big).errors.some((e) => e.message.includes("2MB"))).toBe(true);
  });
});
