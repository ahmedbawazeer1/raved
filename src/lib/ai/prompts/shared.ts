import { z } from "zod";

export const CEFR_ESTIMATES = ["A1", "A1+", "A2", "A2+", "B1", "B1+", "B2", "B2+"] as const;
export type CefrEstimate = (typeof CEFR_ESTIMATES)[number];

/** Appended on the single retry after an invalid answer (docs/AI_PROMPTS.md). */
export const JSON_RETRY = "Return only valid JSON matching the schema.";

/*
 * Lenient readers for model output: models differ in small ways (a "4" instead of 4, a
 * sentence a bit over the limit, "a2" instead of "A2"). We repair those instead of
 * throwing the whole evaluation away; anything structurally wrong is still rejected.
 */

/** Integer score 1–5 (accepts "4" or 4.4). */
export const score = z.coerce
  .number()
  .refine((n) => Number.isFinite(n))
  .transform((n) => Math.min(5, Math.max(1, Math.round(n))));

/** Text cut to `max` characters. */
export const text = (max: number) => z.string().transform((s) => (s.trim().length > max ? `${s.trim().slice(0, max - 1)}…` : s.trim()));

/** CEFR estimate, tolerant to case and spaces ("a2 +" → "A2+"). */
export const cefr = z
  .string()
  .transform((s) => s.toUpperCase().replace(/\s+/g, ""))
  .pipe(z.enum(CEFR_ESTIMATES));

/** At most `max` items (extra ones dropped). */
export const atMost = <T extends z.ZodType>(item: T, max: number) => z.array(item).transform((a) => a.slice(0, max));

/** true / "true" → true; anything else (missing, false, "false") → false. */
export const flag = z.unknown().transform((v) => v === true || v === "true");

/** Short summary of why an answer failed the schema, for the usage log (paths only, no content). */
export function schemaIssues(error: z.ZodError): string {
  return error.issues
    .slice(0, 4)
    .map((i) => `${i.path.join(".") || "(root)"} ${i.code}`)
    .join("; ");
}
