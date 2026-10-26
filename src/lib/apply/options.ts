/** Choices shown in the application form (step 2). Values match DB check constraints. */
export const TARGET_EXAMS = [
  { value: "ielts", label: "IELTS" },
  { value: "toefl", label: "TOEFL iBT" },
  { value: "det", label: "Duolingo English Test" },
  { value: "undecided", label: "لم أقرر بعد" },
] as const;

export const TARGET_DATES = [
  { value: "this_year", label: "خلال هذه السنة" },
  { value: "grad_summer", label: "صيف سنة التخرج" },
  { value: "after_grad", label: "بعد التخرج" },
  { value: "unknown", label: "لا أعرف بعد" },
] as const;

export const DAILY_MINUTES = [15, 25, 35, 45, 60] as const;

export type TargetExam = (typeof TARGET_EXAMS)[number]["value"];
export type TargetDate = (typeof TARGET_DATES)[number]["value"];

export function targetExamLabel(value: string | null | undefined): string {
  return TARGET_EXAMS.find((e) => e.value === value)?.label ?? "—";
}

export function targetDateLabel(value: string | null | undefined): string {
  return TARGET_DATES.find((d) => d.value === value)?.label ?? "—";
}

/** Teacher recommendation upload rules (APP-04). */
export const RECOMMENDATION_MAX_BYTES = 2 * 1024 * 1024;
export const RECOMMENDATION_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;
