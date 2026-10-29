"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AI_ERROR_AR, AiError, isTemporary } from "@/lib/ai/errors";
import { remainingToday } from "@/lib/ai/limits";
import { assertCanUse, assistantReply, evaluateJson, transcribeSpeech } from "@/lib/ai/provider";
import { ASSISTANT_HISTORY, assistantSystem } from "@/lib/ai/prompts/assistant";
import { ROLEPLAY_HISTORY, ROLEPLAY_MIN_TURNS, roleplaySystem } from "@/lib/ai/prompts/roleplay";
import { createClient } from "@/lib/supabase/server";
import { SPEAKING_PROMPT_VERSION, SPEAKING_SYSTEM, speakingSchema, speakingUserMessage, type SpeakingFeedback } from "@/lib/ai/prompts/speaking";
import { WRITING_PROMPT_VERSION, WRITING_SYSTEM, writingSchema, writingUserMessage, type WritingFeedback } from "@/lib/ai/prompts/writing";
import { redact } from "@/lib/ai/redact";
import { requireActiveStudent } from "@/lib/auth/session";
import { getTaskLesson } from "@/lib/practice/server";
import { countWords, lessonSummary } from "@/lib/practice/text";
import { createAdminClient } from "@/lib/supabase/admin";


const uuid = z.uuid();

function aiMessage(e: unknown): string {
  return e instanceof AiError ? AI_ERROR_AR[e.kind] : AI_ERROR_AR.unavailable;
}

// ---------------------------------------------------------------------------
// Speaking
// ---------------------------------------------------------------------------

/** Whisper fallback: the recording is forwarded once and never written anywhere. */
export async function transcribeRecording(formData: FormData): Promise<{ text?: string; error?: string }> {
  const { userId } = await requireActiveStudent();
  const audio = formData.get("audio");
  if (!(audio instanceof Blob) || audio.size === 0) return { error: "لم يصل التسجيل. حاول مرة أخرى." };
  if (audio.size > 3 * 1024 * 1024) return { error: "التسجيل طويل جداً. سجّل 90 ثانية أو أقل." };
  if (!audio.type.startsWith("audio/")) return { error: "صيغة التسجيل غير مدعومة." };
  try {
    await assertCanUse(userId, "speaking");
    const text = await transcribeSpeech(userId, new Uint8Array(await audio.arrayBuffer()));
    return { text };
  } catch (e) {
    return { error: aiMessage(e) };
  }
}

const speakingInput = z.object({
  lessonId: uuid,
  transcript: z.string().trim().max(5000),
  durationSec: z.number().int().min(0).max(600),
  transcription: z.enum(["browser", "whisper"]),
});

export async function evaluateSpeaking(input: z.infer<typeof speakingInput>): Promise<{ id?: string; error?: string }> {
  const parsed = speakingInput.safeParse(input);
  if (!parsed.success) return { error: "حدث خطأ. حدّث الصفحة." };
  const { userId, profile } = await requireActiveStudent();
  const lesson = await getTaskLesson(parsed.data.lessonId);
  if (!lesson?.speaking) return { error: "لم نجد هذه المهمة." };
  if (countWords(parsed.data.transcript) < 3) return { error: "لم نسمع كلاماً كافياً. تكلّم بصوت واضح وحاول مرة أخرى." };

  const transcript = redact(parsed.data.transcript, { knownNames: [profile.full_name] });
  try {
    await assertCanUse(userId, "speaking");
    const result = await evaluateJson<SpeakingFeedback>({
      studentId: userId,
      feature: "speaking",
      system: SPEAKING_SYSTEM,
      prompt: speakingUserMessage({
        prompt: lesson.speaking.prompt_en,
        level: lesson.level,
        grammarPoint: lesson.grammarPoint,
        transcript,
        seconds: parsed.data.durationSec,
      }),
      schema: speakingSchema,
      fake: () => ({
        scores: { task: 4, fluency: 3, grammar: 4, vocabulary: 3 },
        estimated_cefr: "A1+",
        strengths_ar: "قدّمت نفسك بجمل واضحة ومرتبة.",
        corrections: [{ wrong: "I from Aden", right: "I am from Aden", explanation_ar: "نضع am بعد I قبل المكان." }],
        tip_ar: "أضف جملة عن هواياتك، مثل: I like reading.",
        improved_version: "Hello, I am from Aden. I like football and I play it with my friends.",
      }),
    });
    const { data, error } = await createAdminClient()
      .from("speaking_attempts")
      .insert({
        student_id: userId,
        lesson_id: lesson.id,
        prompt_en: lesson.speaking.prompt_en,
        transcript,
        duration_sec: parsed.data.durationSec,
        transcription: parsed.data.transcription,
        status: "evaluated",
        scores: result.data.scores,
        feedback: result.data,
        estimated_cefr: result.data.estimated_cefr,
        provider: result.provider,
        model: result.model,
        prompt_version: SPEAKING_PROMPT_VERSION,
      })
      .select("id")
      .single();
    if (error) return { error: "تعذر حفظ التقييم. حاول مرة أخرى." };
    revalidatePath("/student/practice");
    return { id: data.id };
  } catch (e) {
    return { error: aiMessage(e) };
  }
}

// ---------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------

const writingInput = z.object({
  lessonId: uuid,
  text: z.string().max(6000),
  clientId: uuid,
  parentId: uuid.nullable(),
});

export interface WritingResult {
  id?: string;
  /** Saved but not evaluated yet (limit, pause, provider down). */
  queued?: boolean;
  error?: string;
}

async function runWritingEvaluation(submissionId: string, studentId: string, fullName: string): Promise<WritingResult> {
  const admin = createAdminClient();
  const { data: sub } = await admin
    .from("writing_submissions")
    .select("id, lesson_id, text, status")
    .eq("id", submissionId)
    .eq("student_id", studentId)
    .single();
  if (!sub) return { error: "لم نجد كتابتك." };
  if (sub.status === "evaluated") return { id: sub.id };
  const lesson = await getTaskLesson(sub.lesson_id);
  if (!lesson?.writing) return { error: "لم نجد هذه المهمة." };

  try {
    await assertCanUse(studentId, "writing");
    const text = redact(sub.text, { knownNames: [fullName] });
    const result = await evaluateJson<WritingFeedback>({
      studentId,
      feature: "writing",
      system: WRITING_SYSTEM,
      prompt: writingUserMessage({
        prompt: lesson.writing.prompt_en,
        level: lesson.level,
        minWords: lesson.writing.min_words,
        maxWords: lesson.writing.max_words,
        text,
      }),
      schema: writingSchema,
      fake: () => ({
        scores: { task_achievement: 4, coherence: 3, vocabulary: 3, grammar: 3 },
        estimated_cefr: "A1+",
        errors: [{ text: text.split(/\s+/)[0] ?? "", correction: "My", explanation_ar: "ابدأ الجملة بحرف كبير.", optional: false }],
        strengths_ar: "كتبت عن أسرتك بجمل بسيطة وواضحة.",
        next_step_ar: "اربط الجمل بكلمة and أو but.",
      }),
    });
    await admin
      .from("writing_submissions")
      .update({
        status: "evaluated",
        scores: result.data.scores,
        feedback: result.data,
        estimated_cefr: result.data.estimated_cefr,
        provider: result.provider,
        model: result.model,
        prompt_version: WRITING_PROMPT_VERSION,
        evaluated_at: new Date().toISOString(),
      })
      .eq("id", sub.id);
    return { id: sub.id };
  } catch (e) {
    if (e instanceof AiError && (isTemporary(e.kind) || e.kind === "limit")) {
      return { id: sub.id, queued: true, error: AI_ERROR_AR[e.kind] };
    }
    return { id: sub.id, queued: true, error: aiMessage(e) };
  }
}

/** Saves the text (idempotent per client id, for offline retries) and evaluates it if possible. */
export async function submitWriting(input: z.infer<typeof writingInput>): Promise<WritingResult> {
  const parsed = writingInput.safeParse(input);
  if (!parsed.success) return { error: "حدث خطأ. حدّث الصفحة." };
  const { userId, profile } = await requireActiveStudent();
  const { lessonId, clientId, parentId } = parsed.data;
  const text = parsed.data.text.trim();
  const lesson = await getTaskLesson(lessonId);
  if (!lesson?.writing) return { error: "لم نجد هذه المهمة." };
  const words = countWords(text);
  const minimum = Math.min(10, lesson.writing.min_words);
  if (words < minimum) return { error: `اكتب ${minimum} كلمات على الأقل قبل الإرسال.` };

  const admin = createAdminClient();
  const { data: existing } = await admin.from("writing_submissions").select("id").eq("student_id", userId).eq("client_id", clientId).maybeSingle();
  let id = existing?.id;
  if (!id) {
    let version = 1;
    if (parentId) {
      const { data: parent } = await admin.from("writing_submissions").select("version").eq("id", parentId).eq("student_id", userId).maybeSingle();
      version = Math.min(20, (parent?.version ?? 0) + 1);
    }
    const { data, error } = await admin
      .from("writing_submissions")
      .insert({
        student_id: userId,
        lesson_id: lessonId,
        parent_id: parentId,
        version,
        prompt_en: lesson.writing.prompt_en,
        text,
        word_count: words,
        client_id: clientId,
      })
      .select("id")
      .single();
    if (error) return { error: "تعذر حفظ كتابتك. حاول مرة أخرى." };
    id = data.id;
  }
  const result = await runWritingEvaluation(id, userId, profile.full_name);
  revalidatePath("/student/practice");
  return result;
}

export async function evaluateWritingNow(submissionId: string): Promise<WritingResult> {
  if (!uuid.safeParse(submissionId).success) return { error: "حدث خطأ." };
  const { userId, profile } = await requireActiveStudent();
  const result = await runWritingEvaluation(submissionId, userId, profile.full_name);
  revalidatePath(`/student/practice/writing/result/${submissionId}`);
  return result;
}

// ---------------------------------------------------------------------------
// Lesson assistant
// ---------------------------------------------------------------------------

const assistantInput = z.object({
  lessonId: uuid,
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(1000) }))
    .min(1)
    .max(20),
});

export async function askAssistant(input: z.infer<typeof assistantInput>): Promise<{ reply?: string; error?: string; remaining?: number }> {
  const parsed = assistantInput.safeParse(input);
  if (!parsed.success) return { error: "اكتب سؤالاً أقصر." };
  const { userId, profile } = await requireActiveStudent();
  const lesson = await getTaskLesson(parsed.data.lessonId);
  if (!lesson) return { error: "لم نجد هذا الدرس." };
  const history = parsed.data.messages.slice(-ASSISTANT_HISTORY);
  if (history.at(-1)?.role !== "user") return { error: "اكتب سؤالك." };

  try {
    await assertCanUse(userId, "assistant");
    const result = await assistantReply({
      studentId: userId,
      system: assistantSystem({ lessonTitle: lesson.title, pathTitle: lesson.pathTitle, level: lesson.level, lessonText: lessonSummary(lesson.blocks) }),
      messages: history.map((m) => ({ role: m.role, content: m.role === "user" ? redact(m.content, { knownNames: [profile.full_name] }) : m.content })),
    });
    const { remaining } = await remainingToday(userId);
    return { reply: result.data, remaining: remaining.assistant };
  } catch (e) {
    return { error: aiMessage(e) };
  }
}

// ---------------------------------------------------------------------------
// Role-play with the unit's character (counts against the assistant's daily limit)
// ---------------------------------------------------------------------------

const roleplayInput = z.object({
  unitId: uuid,
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(500) }))
    .min(1)
    .max(40),
});

export async function askRoleplay(input: z.infer<typeof roleplayInput>): Promise<{ reply?: string; error?: string; remaining?: number; counted?: boolean }> {
  const parsed = roleplayInput.safeParse(input);
  if (!parsed.success) return { error: "اكتب رسالة أقصر." };
  const { userId, profile } = await requireActiveStudent();
  const supabase = await createClient();
  const { data: unit } = await supabase
    .from("units")
    .select("id, grammar_point, roleplay, levels(code), vocab_items(word, archived)")
    .eq("id", parsed.data.unitId)
    .maybeSingle();
  const role = unit?.roleplay as { scenario_en?: string } | null;
  if (!unit || !role?.scenario_en) return { error: "لا توجد محادثة لهذه الوحدة." };
  const history = parsed.data.messages.slice(-ROLEPLAY_HISTORY);
  if (history.at(-1)?.role !== "user") return { error: "اكتب رسالتك." };

  try {
    await assertCanUse(userId, "assistant");
    const result = await assistantReply({
      studentId: userId,
      system: roleplaySystem({
        scenario: role.scenario_en,
        level: unit.levels?.code ?? "A1",
        grammar: unit.grammar_point,
        words: (unit.vocab_items ?? []).filter((v) => !v.archived).map((v) => v.word).slice(0, 15),
      }),
      messages: history.map((m) => ({ role: m.role, content: m.role === "user" ? redact(m.content, { knownNames: [profile.full_name] }) : m.content })),
    });
    const turns = parsed.data.messages.filter((m) => m.role === "user").length;
    let counted = false;
    if (turns >= ROLEPLAY_MIN_TURNS) {
      const { error } = await supabase.rpc("record_roleplay", { p_unit_id: unit.id });
      counted = !error;
    }
    const { remaining } = await remainingToday(userId);
    return { reply: result.data, remaining: remaining.assistant, counted };
  } catch (e) {
    return { error: aiMessage(e) };
  }
}
