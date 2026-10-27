/**
 * Model choice (unit tested). Providers retire models, so each task lists models in order
 * of preference and uses the first one the provider still offers. An env override comes first.
 */
export type ModelTask = "evaluation" | "assistant" | "transcription";

export const MODEL_PREFERENCES: Record<ModelTask, string[]> = {
  // Llama first (CLAUDE.md), then other capable open models on Groq.
  evaluation: [
    "meta-llama/llama-4-maverick-17b-128e-instruct",
    "llama-3.3-70b-versatile",
    "meta-llama/llama-4-scout-17b-16e-instruct",
    "openai/gpt-oss-120b",
  ],
  assistant: ["meta-llama/llama-4-scout-17b-16e-instruct", "llama-3.1-8b-instant", "openai/gpt-oss-20b"],
  transcription: ["whisper-large-v3-turbo", "whisper-large-v3"],
};

/**
 * First preferred model the provider lists (an override wins if it is listed). With no list
 * (the listing call failed) the first candidate is used and errors will say why.
 */
export function chooseModel(task: ModelTask, available: string[] | null, override?: string): string {
  const candidates = [...(override ? [override] : []), ...MODEL_PREFERENCES[task]];
  if (!available) return candidates[0];
  const set = new Set(available);
  return candidates.find((m) => set.has(m)) ?? candidates[0];
}
