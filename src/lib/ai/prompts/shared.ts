export const CEFR_ESTIMATES = ["A1", "A1+", "A2", "A2+", "B1", "B1+", "B2", "B2+"] as const;
export type CefrEstimate = (typeof CEFR_ESTIMATES)[number];

/** Appended on the single retry after an invalid answer (docs/AI_PROMPTS.md). */
export const JSON_RETRY = "Return only valid JSON matching the schema.";
