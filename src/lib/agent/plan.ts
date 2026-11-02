/**
 * The path plan the agent proposes (levels → units with objectives), validated with zod
 * before it is shown to the owner for review (unit tested).
 */
import { z } from "zod";

export const planUnitSchema = z.object({
  code: z.string().regex(/^[A-Z0-9]{1,4}-\d{2}$/, "رمز الوحدة مثل A1-01"),
  title_en: z.string().min(2).max(80),
  title_ar: z.string().min(2).max(80),
  stop_ar: z.string().min(2).max(40),
  situation_ar: z.string().min(5).max(300),
  objectives_ar: z.array(z.string().min(3).max(200)).min(2).max(5),
  grammar: z.string().min(2).max(120),
  vocab_domain: z.string().min(2).max(120),
  search_hints: z.array(z.string().min(2).max(120)).min(1).max(5),
});

export const planLevelSchema = z.object({
  code: z.string().min(2).max(10),
  title_ar: z.string().min(2).max(80),
  goal_ar: z.string().min(5).max(400),
  units: z.array(planUnitSchema).min(3).max(30),
});

export const pathPlanSchema = z
  .object({
    summary_ar: z.string().min(10).max(1200),
    levels: z.array(planLevelSchema).min(1).max(12),
  })
  .superRefine((plan, ctx) => {
    const seen = new Set<string>();
    plan.levels.forEach((l, li) =>
      l.units.forEach((u, ui) => {
        if (seen.has(u.code)) ctx.addIssue({ code: "custom", path: ["levels", li, "units", ui, "code"], message: `رمز مكرر: ${u.code}` });
        seen.add(u.code);
      }),
    );
  });

export type PathPlan = z.infer<typeof pathPlanSchema>;
export type PlanUnit = z.infer<typeof planUnitSchema>;

export interface PathContext {
  title: string;
  description: string | null;
  levels: { code: string; title: string; kind: string }[];
  features: string[];
}

export function planPathPrompt(path: PathContext, extra?: string): string {
  return `Design the complete learning path «${path.title}» for Raved.
${path.description ? `Path description: ${path.description}\n` : ""}Existing levels (keep these codes and their order; you may refine titles): ${
    path.levels.length ? path.levels.map((l) => `${l.code} (${l.title}, ${l.kind})`).join(", ") : "none yet — propose them"
  }.
Enabled features: ${path.features.join(", ") || "none"}.

For every level give: code, title_ar, goal_ar (what the student can do at the end, in Arabic) and its units in teaching order.
For every unit give:
- code like "A1-01" (level code + two digits),
- title_en and title_ar,
- stop_ar: the Hadramout place that is this unit's stop on the «رحلة حضرموت» journey map (towns, markets, ports, valleys; avoid repeating a stop inside a level),
- situation_ar: the one everyday situation the whole unit is built around, set in that place,
- objectives_ar: 2–5 can-do statements in Arabic,
- grammar: the one grammar point (progressive across units),
- vocab_domain: the word family taught,
- search_hints: 1–5 English search phrases to find short teaching videos and authentic clips for this unit.
A1 and A2 levels usually need 16–25 units; higher levels 12–20.
${extra ? `\nThe owner's note on the previous version of this plan: ${extra}\n` : ""}
Return JSON exactly in this shape:
{"summary_ar": "...", "levels": [{"code": "...", "title_ar": "...", "goal_ar": "...", "units": [{"code": "...", "title_en": "...", "title_ar": "...", "stop_ar": "...", "situation_ar": "...", "objectives_ar": ["..."], "grammar": "...", "vocab_domain": "...", "search_hints": ["..."]}]}]}`;
}

/** Arabic summary of what failed validation (for the job log). */
export function planErrors(err: z.ZodError): string[] {
  return err.issues.slice(0, 8).map((i) => `${i.path.join(".")}: ${i.message}`);
}

export function countUnits(plan: PathPlan): number {
  return plan.levels.reduce((n, l) => n + l.units.length, 0);
}
