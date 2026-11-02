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
    public code: "not_configured" | "quota" | "blocked" | "bad_response" | "network",
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

export async function callGemini(req: GeminiRequest, env: { apiKey?: string; model?: string } = {}): Promise<GeminiResult> {
  const apiKey = env.apiKey ?? process.env.GEMINI_API_KEY;
  const model = env.model ?? process.env.GEMINI_MODEL ?? GEMINI_MODEL_DEFAULT;
  if (!apiKey) throw new GeminiError("not_configured", "GEMINI_API_KEY is missing");

  const parts: Record<string, unknown>[] = [];
  if (req.youtubeUrl) parts.push({ fileData: { fileUri: req.youtubeUrl, mimeType: "video/*" } });
  parts.push({ text: req.prompt });
  const body: Record<string, unknown> = {
    systemInstruction: { parts: [{ text: req.system }] },
    contents: [{ role: "user", parts }],
    generationConfig: { temperature: req.temperature ?? 0.6, ...(req.json && !req.search ? { responseMimeType: "application/json" } : {}) },
    ...(req.search ? { tools: [{ google_search: {} }] } : {}),
  };

  let res: Response;
  try {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(240_000),
    });
  } catch (e) {
    throw new GeminiError("network", e instanceof Error ? e.message : String(e));
  }
  if (res.status === 429) throw new GeminiError("quota", "Gemini free quota reached, try later");
  if (!res.ok) throw new GeminiError("bad_response", `Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = (await res.json()) as ApiResponse;
  if (data.promptFeedback?.blockReason) throw new GeminiError("blocked", data.promptFeedback.blockReason);
  const cand = data.candidates?.[0];
  const text = (cand?.content?.parts ?? []).map((p) => p.text ?? "").join("");
  if (!text) throw new GeminiError("bad_response", `empty answer (${cand?.finishReason ?? "no candidate"})`);
  const sources = (cand?.groundingMetadata?.groundingChunks ?? [])
    .map((c) => ({ title: c.web?.title ?? "", url: c.web?.uri ?? "" }))
    .filter((s) => s.url);
  return { text, model, sources };
}

/** Reads a JSON answer, tolerating ```json fences around it. */
export function parseJsonAnswer(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(trimmed);
}
