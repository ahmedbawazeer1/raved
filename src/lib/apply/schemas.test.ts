import { describe, expect, it } from "vitest";
import { fieldErrors, sanitizeStep1Draft, sanitizeStep2Draft, step1Schema, step2Schema } from "./schemas";

const valid1 = {
  full_name: "يوسف محمد",
  birth_date: "2010-03-14",
  governorate: "taiz",
  city: "المظفر",
  school: "مدرسة الشعب الثانوية",
  grade: "1",
  stream: "undecided",
  phone: "77 123 4567",
};

describe("step1Schema", () => {
  it("accepts a complete student and normalises the phone", () => {
    const r = step1Schema.parse(valid1);
    expect(r.phone).toBe("+967771234567");
    expect(r.grade).toBe(1);
  });

  it("returns Arabic field errors", () => {
    const r = step1Schema.safeParse({ ...valid1, phone: "123", school: "" });
    expect(r.success).toBe(false);
    if (!r.success) {
      const errs = fieldErrors(r.error);
      expect(errs.phone).toContain("7");
      expect(errs.school).toBe("اكتب اسم المدرسة");
    }
  });

  it("rejects unrealistic birth dates", () => {
    expect(step1Schema.safeParse({ ...valid1, birth_date: "1990-01-01" }).success).toBe(false);
  });
});

describe("sanitizeStep1Draft", () => {
  it("keeps valid fields and drops invalid ones", () => {
    expect(sanitizeStep1Draft({ city: "إب", phone: "12", school: "" })).toEqual({ city: "إب" });
  });
});

describe("step2Schema", () => {
  const valid2 = {
    path_id: "6f1c1d36-2f0b-4a8b-9d7f-0d1f6b1c2a3e",
    target_exam: "ielts",
    target_date: "grad_summer",
    daily_minutes: "25",
    motivation: "",
  };

  it("accepts valid goal data; empty motivation becomes null", () => {
    const r = step2Schema.parse(valid2);
    expect(r.daily_minutes).toBe(25);
    expect(r.motivation).toBeNull();
  });

  it("rejects unknown daily minutes", () => {
    expect(step2Schema.safeParse({ ...valid2, daily_minutes: "7" }).success).toBe(false);
  });

  it("draft keeps a cleared motivation", () => {
    expect(sanitizeStep2Draft({ motivation: "", target_exam: "nope" })).toEqual({ motivation: null });
  });
});
