/**
 * Provider-independent calls (unit tested with a mock model): JSON with schema validation
 * and one retry, plain text, and transcription. No database access here.
 */
import { APICallError, generateText, Output, transcribe, type LanguageModel, type TranscriptionModel } from "ai";
import type { z } from "zod";
import { AiError } from "./errors";
import { JSON_RETRY, schemaIssues } from "./prompts/shared";

export interface CallRecord {
  ok: boolean;
  error?: string;
  inputTokens?: number;
  outputTokens?: number;
}

export interface GenerateOptions {
  model: LanguageModel;
  system: string;
  prompt: string;
  temperature: number;
  maxOutputTokens?: number;
  /** Provider-specific settings, e.g. { groq: { reasoningEffort: "low" } }. */
  providerOptions?: Record<string, Record<string, string>>;
  /** Called once per provider call, for ai_usage logging. */
  onCall?: (call: CallRecord) => Promise<void> | void;
}

function toAiError(e: unknown): AiError {
  if (e instanceof AiError) return e;
  if (APICallError.isInstance(e)) {
    if (e.statusCode === 429) return new AiError("rate_limited", e.message);
    if (e.statusCode === 401 || e.statusCode === 403) return new AiError("not_configured", e.message);
    return new AiError("unavailable", e.message);
  }
  return new AiError("unavailable", e instanceof Error ? e.message : String(e));
}

function isJsonRejected(e: unknown): boolean {
  return APICallError.isInstance(e) && e.statusCode === 400 && /json_validate_failed/i.test(`${e.message} ${e.responseBody ?? ""}`);
}

/** Provider error for the ai_usage log: kind, HTTP status and the provider's message (no student text). */
export function describeError(e: unknown): string {
  const err = toAiError(e);
  const status = APICallError.isInstance(e) ? ` ${e.statusCode ?? ""}` : "";
  return `${err.kind}${status}: ${err.message}`.replace(/\s+/g, " ").slice(0, 300);
}

/**
 * Asks for JSON and validates it; on invalid JSON retries once with "Return only valid JSON
 * matching the schema" (docs/AI_PROMPTS.md). Throws AiError("invalid") after that.
 */
export async function generateJson<T>(options: GenerateOptions & { schema: z.ZodType<T, unknown> }): Promise<T> {
  for (let attempt = 0; attempt < 2; attempt++) {
    let output: unknown;
    try {
      const result = await generateText({
        model: options.model,
        system: options.system,
        prompt: attempt === 0 ? options.prompt : `${options.prompt}\n\n${JSON_RETRY}`,
        temperature: options.temperature,
        // Arabic explanations (and reasoning models' thinking) take many tokens; a cut-off answer is invalid JSON.
        maxOutputTokens: options.maxOutputTokens ?? 3000,
        maxRetries: 1,
        output: Output.json(),
        providerOptions: options.providerOptions,
      });
      output = result.output;
      const parsed = options.schema.safeParse(output);
      await options.onCall?.({
        ok: parsed.success,
        error: parsed.success ? undefined : `invalid_json: ${schemaIssues(parsed.error)}`,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
      });
      if (parsed.success) return parsed.data;
    } catch (e) {
      const err = toAiError(e);
      // Unparseable text is "invalid" (retry); provider errors stop here. Groq's JSON mode
      // rejects malformed or cut-off JSON itself with a 400 "json_validate_failed".
      const unparseable = (!APICallError.isInstance(e) && !(e instanceof AiError)) || isJsonRejected(e);
      await options.onCall?.({ ok: false, error: unparseable ? `invalid_json${APICallError.isInstance(e) ? " (rejected by provider)" : ""}` : describeError(e) });
      if (!unparseable) throw err;
    }
  }
  throw new AiError("invalid");
}

export async function generatePlainText(options: GenerateOptions & { messages?: { role: "user" | "assistant"; content: string }[] }): Promise<string> {
  try {
    const result = await generateText({
      model: options.model,
      system: options.system,
      ...(options.messages ? { messages: options.messages } : { prompt: options.prompt }),
      temperature: options.temperature,
      maxOutputTokens: options.maxOutputTokens ?? 1500,
      providerOptions: options.providerOptions,
      maxRetries: 1,
    });
    const text = result.text.trim();
    await options.onCall?.({ ok: text.length > 0, error: text ? undefined : "empty", inputTokens: result.usage.inputTokens, outputTokens: result.usage.outputTokens });
    if (!text) throw new AiError("invalid");
    return text;
  } catch (e) {
    const err = toAiError(e);
    if (!(e instanceof AiError)) await options.onCall?.({ ok: false, error: describeError(e) });
    throw err;
  }
}

/** Speech to text. The audio is passed through and never kept. */
export async function transcribeAudio(options: {
  model: TranscriptionModel;
  audio: Uint8Array;
  onCall?: GenerateOptions["onCall"];
}): Promise<string> {
  try {
    const result = await transcribe({ model: options.model, audio: options.audio, maxRetries: 1, providerOptions: { groq: { language: "en" } } });
    await options.onCall?.({ ok: true });
    return result.text.trim();
  } catch (e) {
    const err = toAiError(e);
    await options.onCall?.({ ok: false, error: describeError(e) });
    throw err;
  }
}
