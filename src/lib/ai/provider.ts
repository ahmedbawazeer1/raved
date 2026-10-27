import "server-only";
import { createGroq } from "@ai-sdk/groq";
import type { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { AiError } from "./errors";
import { generateJson, generatePlainText, transcribeAudio, type CallRecord } from "./generate";
import { getAiSettings, remainingToday, type LimitedFeature } from "./limits";
import { chooseModel, type ModelTask } from "./models";

/**
 * The only door to AI providers. Student text goes to Groq only (CLAUDE.md: Gemini's free
 * tier may train on inputs, so it never receives student content). Models can be changed
 * with env vars without code changes.
 */
type Feature = LimitedFeature | "transcription";

const OVERRIDES: Record<ModelTask, string | undefined> = {
  evaluation: process.env.GROQ_EVAL_MODEL,
  assistant: process.env.GROQ_ASSISTANT_MODEL,
  transcription: process.env.GROQ_TRANSCRIBE_MODEL,
};

let modelList: { at: number; ids: string[] } | null = null;
const MODEL_LIST_TTL_MS = 60 * 60 * 1000;

/** Groq's current models (cached for an hour), so retired models are skipped automatically. */
async function availableModels(): Promise<string[] | null> {
  if (modelList && Date.now() - modelList.at < MODEL_LIST_TTL_MS) return modelList.ids;
  try {
    const res = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return modelList?.ids ?? null;
    const body = (await res.json()) as { data?: { id: string; active?: boolean }[] };
    const ids = (body.data ?? []).filter((m) => m.active !== false).map((m) => m.id);
    modelList = { at: Date.now(), ids };
    return ids;
  } catch {
    return modelList?.ids ?? null;
  }
}

/** Reasoning models (gpt-oss) think before answering: keep that short to save tokens and time. */
function providerOptionsFor(model: string) {
  return model.startsWith("openai/gpt-oss") ? { groq: { reasoningEffort: "low" } } : undefined;
}

async function modelFor(task: ModelTask): Promise<string> {
  return chooseModel(task, await availableModels(), OVERRIDES[task]);
}

/** Deterministic answers for end-to-end tests (never on Vercel). */
export function fakeAiEnabled(): boolean {
  return process.env.RAVED_AI_FAKE === "1" && !process.env.VERCEL;
}

export function aiConfigured(): boolean {
  return fakeAiEnabled() || Boolean(process.env.GROQ_API_KEY);
}

function groq() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new AiError("not_configured");
  return createGroq({ apiKey });
}

async function log(studentId: string, feature: Feature, provider: string, model: string, call: CallRecord) {
  await createAdminClient().from("ai_usage").insert({
    student_id: studentId,
    feature,
    provider,
    model,
    ok: call.ok,
    error: call.error ?? null,
    input_tokens: call.inputTokens ?? null,
    output_tokens: call.outputTokens ?? null,
  });
}

/** Throws when AI is paused, not configured, or the student's daily limit is used up. */
export async function assertCanUse(studentId: string, feature: LimitedFeature): Promise<void> {
  if (!aiConfigured()) throw new AiError("not_configured");
  const [settings, today] = await Promise.all([getAiSettings(), remainingToday(studentId)]);
  if (settings.paused) throw new AiError("paused");
  if (today.remaining[feature] <= 0) throw new AiError("limit");
}

export interface AiResult<T> {
  data: T;
  provider: string;
  model: string;
}

export async function evaluateJson<T>(v: {
  studentId: string;
  feature: "speaking" | "writing";
  system: string;
  prompt: string;
  schema: z.ZodType<T, unknown>;
  fake: () => T;
}): Promise<AiResult<T>> {
  if (fakeAiEnabled()) {
    await log(v.studentId, v.feature, "fake", "fake", { ok: true });
    return { data: v.schema.parse(v.fake()), provider: "fake", model: "fake" };
  }
  const model = await modelFor("evaluation");
  const data = await generateJson({
    model: groq()(model),
    system: v.system,
    prompt: v.prompt,
    temperature: 0.2,
    schema: v.schema,
    providerOptions: providerOptionsFor(model),
    onCall: (call) => log(v.studentId, v.feature, "groq", model, call),
  });
  return { data, provider: "groq", model };
}

export async function assistantReply(v: {
  studentId: string;
  system: string;
  messages: { role: "user" | "assistant"; content: string }[];
}): Promise<AiResult<string>> {
  if (fakeAiEnabled()) {
    await log(v.studentId, "assistant", "fake", "fake", { ok: true });
    return { data: "هذا مثال على إجابة المساعد: نستخدم am مع I، مثل: I am a student.", provider: "fake", model: "fake" };
  }
  const model = await modelFor("assistant");
  const data = await generatePlainText({
    model: groq()(model),
    system: v.system,
    prompt: "",
    messages: v.messages,
    temperature: 0.5,
    providerOptions: providerOptionsFor(model),
    onCall: (call) => log(v.studentId, "assistant", "groq", model, call),
  });
  return { data, provider: "groq", model };
}

/** Whisper fallback when the browser cannot transcribe. The audio is not stored anywhere. */
export async function transcribeSpeech(studentId: string, audio: Uint8Array): Promise<string> {
  if (fakeAiEnabled()) return "Hello. I am from Aden. I like football.";
  const model = await modelFor("transcription");
  return transcribeAudio({ model: groq().transcription(model), audio, onCall: (call) => log(studentId, "transcription", "groq", model, call) });
}
