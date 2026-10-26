import { z } from "zod";
import { normalizeYemeniMobile, ageFrom } from "@/lib/yemen";
import { DAILY_MINUTES, TARGET_DATES, TARGET_EXAMS } from "./options";

const requiredText = (label: string, max: number) =>
  z
    .string({ error: `اكتب ${label}` })
    .trim()
    .min(2, `اكتب ${label}`)
    .max(max, `${label} طويل جداً`);

export const step1Schema = z.object({
  full_name: requiredText("اسمك الكامل", 120),
  birth_date: z
    .string({ error: "اختر تاريخ ميلادك" })
    .regex(/^\d{4}-\d{2}-\d{2}$/, "اختر تاريخ ميلادك")
    .refine((v) => {
      const age = ageFrom(v);
      return age >= 11 && age <= 25;
    }, "تحقق من تاريخ الميلاد"),
  governorate: z.string({ error: "اختر محافظتك" }).min(1, "اختر محافظتك"),
  city: requiredText("المدينة أو المديرية", 80),
  school: requiredText("اسم المدرسة", 120),
  grade: z.coerce.number({ error: "اختر صفك" }).int().min(1, "اختر صفك").max(3, "اختر صفك"),
  stream: z.enum(["science", "literary", "undecided"], { error: "اختر القسم" }),
  phone: z
    .string({ error: "اكتب رقم هاتفك" })
    .transform((v, ctx) => {
      const normalized = normalizeYemeniMobile(v);
      if (!normalized) {
        ctx.addIssue({ code: "custom", message: "رقم جوال يمني من 9 أرقام يبدأ بـ 7، مثل 77 123 4567" });
        return z.NEVER;
      }
      return normalized;
    }),
});

export type Step1Input = z.input<typeof step1Schema>;
export type Step1Data = z.output<typeof step1Schema>;

/** Draft autosave: every field optional, invalid values dropped instead of failing the save. */
export function sanitizeStep1Draft(input: Partial<Record<keyof Step1Input, unknown>>): Partial<Step1Data> {
  const out: Partial<Step1Data> = {};
  for (const key of Object.keys(step1Schema.shape) as (keyof Step1Input)[]) {
    const raw = input[key];
    if (raw === undefined || raw === null || raw === "") continue;
    const parsed = step1Schema.shape[key].safeParse(raw);
    if (parsed.success) (out as Record<string, unknown>)[key] = parsed.data;
  }
  return out;
}

export const step2Schema = z.object({
  path_id: z.uuid({ error: "اختر المسار" }),
  target_exam: z.enum(TARGET_EXAMS.map((e) => e.value) as [string, ...string[]], { error: "اختر الامتحان" }),
  target_date: z.enum(TARGET_DATES.map((d) => d.value) as [string, ...string[]], { error: "اختر الموعد" }),
  daily_minutes: z.coerce
    .number({ error: "اختر الدقائق اليومية" })
    .refine((v) => (DAILY_MINUTES as readonly number[]).includes(v), "اختر الدقائق اليومية"),
  motivation: z
    .string()
    .trim()
    .max(600, "اكتب 600 حرف كحد أقصى")
    .optional()
    .transform((v) => (v ? v : null)),
});

export type Step2Input = z.input<typeof step2Schema>;
export type Step2Data = z.output<typeof step2Schema>;

export function sanitizeStep2Draft(input: Partial<Record<keyof Step2Input, unknown>>): Partial<Step2Data> {
  const out: Partial<Step2Data> = {};
  for (const key of Object.keys(step2Schema.shape) as (keyof Step2Input)[]) {
    const raw = input[key];
    if (raw === undefined || raw === null) continue;
    if (raw === "" && key !== "motivation") continue;
    const parsed = step2Schema.shape[key].safeParse(raw);
    if (parsed.success) (out as Record<string, unknown>)[key] = parsed.data;
  }
  return out;
}

/** Flattens zod issues to { field: firstMessage } for forms. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_");
    out[key] ??= issue.message;
  }
  return out;
}
