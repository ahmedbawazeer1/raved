import { z } from "zod";
import { LEVELS, SKILLS } from "./engine";

/** A placement bank file: content/<path>/placement.json (content only, no code per path). */
export const placementQuestionSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    level: z.enum(LEVELS),
    skill: z.enum(SKILLS),
    /** Arabic instruction or question. */
    prompt: z.string().min(3),
    /** English sentence or passage shown to the student. */
    text: z.string().min(1).optional(),
    /** English text read aloud by the device (listening). Shown only if the device has no voice. */
    listen: z.string().min(1).optional(),
    options: z.array(z.string().min(1)).min(2).max(4),
    answer: z.number().int().min(0),
  })
  .refine((q) => q.answer < q.options.length, { message: "رقم الإجابة الصحيحة أكبر من عدد الخيارات" })
  .refine((q) => (q.skill === "listening") === Boolean(q.listen), { message: "أسئلة الاستماع فقط تحتاج listen" });

export const placementBankSchema = z
  .object({
    path: z.string().min(1),
    version: z.number().int().min(1),
    questions: z.array(placementQuestionSchema).min(8),
  })
  .refine((b) => new Set(b.questions.map((q) => q.id)).size === b.questions.length, { message: "يوجد رقم سؤال مكرر" });

export type PlacementBankFile = z.infer<typeof placementBankSchema>;
export type PlacementQuestionFile = z.infer<typeof placementQuestionSchema>;

/** Every level needs at least two blocks' worth of questions covering all four skills. */
export function bankProblems(bank: PlacementBankFile): string[] {
  const problems: string[] = [];
  for (const level of LEVELS) {
    const at = bank.questions.filter((q) => q.level === level);
    if (at.length < 8) problems.push(`المستوى ${level} فيه ${at.length} أسئلة فقط (الحد الأدنى 8)`);
    for (const skill of SKILLS) {
      if (!at.some((q) => q.skill === skill)) problems.push(`المستوى ${level} بلا أسئلة ${skill}`);
    }
  }
  return problems;
}
