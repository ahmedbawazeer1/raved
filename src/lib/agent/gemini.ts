/**
 * Calls Gemini (Google AI Studio, free tier) for the content agent. Only public, non-student
 * content goes here (CLAUDE.md): curriculum plans, lesson drafts, public videos and articles.
 * Plain fetch so it runs both on the server and in the background runner (scripts/agent).
 */
export interface GeminiRequest {
  system: string;
  prompt: string;
  /** Ask for JSON output. */
  json?: boolean;
  /** A public YouTube video for the model to watch. */
  youtubeUrl?: string;
  /** Let the model search Google (cannot be combined with `json`). */
  search?: boolean;
  temperature?: number;
}

export interface GeminiResult {
  text: string;
  model: string;
  sources: { title: string; url: string }[];
}

export class GeminiError extends Error {
  constructor(
    public code: "not_configured" | "quota" | "busy" | "blocked" | "bad_response" | "network",
    message?: string,
  ) {
    super(message ?? code);
  }
}

export const GEMINI_MODEL_DEFAULT = "gemini-2.5-flash";

interface ApiResponse {
  candidates?: {
    content?: { parts?: { text?: string }[] };
    finishReason?: string;
    groundingMetadata?: { groundingChunks?: { web?: { uri?: string; title?: string } }[] };
  }[];
  promptFeedback?: { blockReason?: string };
}

const FLASH = /^gemini-[\d.]+-flash(-latest|-\d{3})?$/;
const FLASH_LITE = /^gemini-[\d.]+-flash-lite(-latest|-\d{3})?$/;

/**
 * Flash models that can generate content, best first: "gemini-flash-latest", then the newest
 * versioned flash, then the lite variants as a last resort (models get retired and each one has
 * its own free daily quota, so the name is not hard-coded). Skips image, audio, live and preview.
 */
export function flashModels(models: { name: string; supportedGenerationMethods?: string[] }[]): string[] {
  const ids = models.filter((m) => m.supportedGenerationMethods?.includes("generateContent")).map((m) => m.name.replace(/^models\//, ""));
  const version = (id: string) => Number(/^gemini-([\d.]+)/.exec(id)?.[1] ?? 0);
  const byVersion = (a: string, b: string) => version(b) - version(a) || a.length - b.length;
  return [
    ...ids.filter((id) => id === "gemini-flash-latest"),
    ...ids.filter((id) => FLASH.test(id)).sort(byVersion),
    ...ids.filter((id) => id === "gemini-flash-lite-latest"),
    ...ids.filter((id) => FLASH_LITE.test(id)).sort(byVersion),
  ];
}

export function pickFlashModel(models: { name: string; supportedGenerationMethods?: string[] }[]): string | null {
  return flashModels(models)[0] ?? null;
}

/** What a 429 means: a per-minute limit (wait `retrySec` and retry) or the model's daily quota. */
export function readQuota(body: string): { perMinute: boolean; retrySec: number; detail: string } {
  let ids: string[] = [];
  let retrySec = 0;
  try {
    const details = (JSON.parse(body) as { error?: { details?: Record<string, unknown>[] } }).error?.details ?? [];
    for (const d of details) {
      if (Array.isArray(d.violations)) ids = ids.concat((d.violations as { quotaId?: string }[]).map((v) => v.quotaId ?? ""));
      if (typeof d.retryDelay === "string") retrySec = Number.parseFloat(d.retryDelay) || 0;
    }
  } catch {
    // not JSON
  }
  const perMinute = ids.length > 0 ? ids.every((id) => /PerMinute/i.test(id)) : retrySec > 0 && retrySec <= 60;
  return { perMinute, retrySec: Math.min(Math.max(retrySec, 5), 65), detail: ids.join(", ") || body.slice(0, 200) };
}

let candidates: string[] | null = null;
/** Models that answered "daily quota used up" during this run. */
const exhausted = new Set<string>();

async function modelList(apiKey: string): Promise<string[]> {
  if (candidates) return candidates;
  try {
    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", {
      headers: { "x-goog-api-key": apiKey },
      signal: AbortSignal.timeout(20_000),
    });
    if (res.ok) {
      const body = (await res.json()) as { models?: { name: string; supportedGenerationMethods?: string[] }[] };
      candidates = flashModels(body.models ?? []);
    }
  } catch {
    // fall back below
  }
  if (!candidates?.length) candidates = [GEMINI_MODEL_DEFAULT];
  return candidates;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function callGemini(req: GeminiRequest, env: { apiKey?: string; model?: string; retryDelayMs?: number } = {}): Promise<GeminiResult> {
  const apiKey = env.apiKey ?? process.env.GEMINI_API_KEY;
  if (!apiKey) throw new GeminiError("not_configured", "GEMINI_API_KEY is missing");
  const fixed = env.model || process.env.GEMINI_MODEL;
  const models = fixed ? [fixed] : (await modelList(apiKey)).filter((m) => !exhausted.has(m));
  if (models.length === 0) throw new GeminiError("quota", "all flash models are out of free quota today");

  const parts: Record<string, unknown>[] = [];
  if (req.youtubeUrl) parts.push({ fileData: { fileUri: req.youtubeUrl, mimeType: "video/*" } });
  parts.push({ text: req.prompt });
  const body: Record<string, unknown> = {
    systemInstruction: { parts: [{ text: req.system }] },
    contents: [{ role: "user", parts }],
    generationConfig: { temperature: req.temperature ?? 0.6, ...(req.json && !req.search ? { responseMimeType: "application/json" } : {}) },
    ...(req.search ? { tools: [{ google_search: {} }] } : {}),
  };
  const unit = env.retryDelayMs ?? 10_000;

  let quotaDetail = "";
  for (const model of models) {
    // The free tier is sometimes overloaded (503/500) or rate limited per minute (429): wait and retry.
    let res: Response | null = null;
    let text = "";
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: "POST",
          headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(240_000),
        });
      } catch (e) {
        if (attempt === 3) throw new GeminiError("network", e instanceof Error ? e.message : String(e));
        await sleep(unit * (attempt + 1));
        continue;
      }
      if (res.ok) break;
      text = await res.text();
      if (res.status === 429) {
        const q = readQuota(text);
        quotaDetail = `${model}: ${q.detail}`;
        if (!q.perMinute) break;
        if (attempt < 3) await sleep((unit / 10_000) * q.retrySec * 1000);
        continue;
      }
      if (res.status !== 503 && res.status !== 500) break;
      if (attempt < 3) await sleep(unit * (attempt + 1));
    }
    if (!res) throw new GeminiError("network", "no response");
    if (res.status === 429) {
      // This model's daily free quota is used up: try the next flash model.
      exhausted.add(model);
      continue;
    }
    if (res.status === 503 || res.status === 500) throw new GeminiError("busy", `Gemini ${res.status}: busy`);
    if (!res.ok) throw new GeminiError("bad_response", `Gemini ${res.status}: ${text.slice(0, 300)}`);
    const data = (await res.json()) as ApiResponse;
    if (data.promptFeedback?.blockReason) throw new GeminiError("blocked", data.promptFeedback.blockReason);
    const cand = data.candidates?.[0];
    const answer = (cand?.content?.parts ?? []).map((p) => p.text ?? "").join("");
    if (!answer) throw new GeminiError("bad_response", `empty answer (${cand?.finishReason ?? "no candidate"})`);
    const sources = (cand?.groundingMetadata?.groundingChunks ?? []).map((c) => ({ title: c.web?.title ?? "", url: c.web?.uri ?? "" })).filter((s) => s.url);
    return { text: answer, model, sources };
  }
  throw new GeminiError("quota", `free quota used up (${quotaDetail})`);
}

/** Reads a JSON answer, tolerating ```json fences around it. */
export function parseJsonAnswer(text: string): unknown {
  const trimmed = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  return JSON.parse(trimmed);
}
