"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireActiveStudent } from "@/lib/auth/session";
import { LESSON_BLOCKERS_AR } from "@/lib/gamification/blockers";

const uuid = z.uuid();

export interface CompleteLessonState {
  error?: string;
}

/** Completes a lesson (only when every requirement is met) and goes to the next step. */
export async function completeLesson(_prev: CompleteLessonState, formData: FormData): Promise<CompleteLessonState> {
  await requireActiveStudent();
  const lessonId = uuid.safeParse(formData.get("lesson_id"));
  if (!lessonId.success) return { error: "حدث خطأ." };
  const next = String(formData.get("next") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.rpc("complete_lesson", { p_lesson_id: lessonId.data });
  if (error) return { error: LESSON_BLOCKERS_AR[error.message] ?? "تعذر الحفظ. حاول مرة أخرى." };
  revalidatePath("/student", "layout");
  redirect(next.startsWith("/student") ? next : "/student");
}

const youtubeId = z.string().regex(/^[A-Za-z0-9_-]{11}$/);

/** Saves how much of a video was really played; returns the server's view of it. */
export async function recordVideoWatch(
  videoId: string,
  watchedSec: number,
): Promise<{ watched: number; duration: number; done: boolean } | null> {
  await requireActiveStudent();
  const id = youtubeId.safeParse(videoId);
  const sec = z.number().int().min(0).max(36_000).safeParse(Math.floor(watchedSec));
  if (!id.success || !sec.success) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("record_video_watch", { p_youtube_id: id.data, p_watched_sec: sec.data });
  if (error || !data) return null;
  const d = data as { watched_sec: number; duration_sec: number; done: boolean };
  return { watched: d.watched_sec, duration: d.duration_sec, done: d.done };
}

export interface FeedbackState {
  ok?: boolean;
  error?: string;
}

export async function rateLesson(_prev: FeedbackState, formData: FormData): Promise<FeedbackState> {
  const { userId } = await requireActiveStudent();
  const lessonId = uuid.safeParse(formData.get("lesson_id"));
  const rating = z.enum(["useful", "not_useful"]).safeParse(formData.get("rating"));
  if (!lessonId.success || !rating.success) return { error: "حدث خطأ." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("lesson_progress")
    .upsert({ student_id: userId, lesson_id: lessonId.data, rating: rating.data }, { onConflict: "student_id,lesson_id" });
  if (error) return { error: "تعذر الحفظ. حاول مرة أخرى." };
  return { ok: true };
}

export async function reportLesson(_prev: FeedbackState, formData: FormData): Promise<FeedbackState> {
  const { userId } = await requireActiveStudent();
  const lessonId = uuid.safeParse(formData.get("lesson_id"));
  const note = String(formData.get("note") ?? "").trim().slice(0, 1000);
  if (!lessonId.success) return { error: "حدث خطأ." };
  if (note.length < 3) return { error: "اكتب الخطأ الذي وجدته." };

  const supabase = await createClient();
  const { error } = await supabase.from("reports").insert({ student_id: userId, lesson_id: lessonId.data, kind: "error", note });
  if (error) return { error: "تعذر الإرسال. حاول مرة أخرى." };
  return { ok: true };
}

export interface QuizSubmitState {
  error?: string;
}

/** Sends answers to the server for grading (answers are never checked in the browser). */
export async function submitQuiz(quizId: string, answers: Record<string, unknown>, clientId: string): Promise<QuizSubmitState> {
  await requireActiveStudent();
  const parsedQuiz = uuid.safeParse(quizId);
  const parsedClient = uuid.safeParse(clientId);
  if (!parsedQuiz.success || !parsedClient.success) return { error: "حدث خطأ. حدّث الصفحة." };

  const supabase = await createClient();
  const { data: attemptId, error } = await supabase.rpc("submit_quiz", {
    p_quiz_id: parsedQuiz.data,
    p_answers: answers as never,
    p_client_id: parsedClient.data,
    p_client_created_at: new Date().toISOString(),
  });
  if (error || !attemptId) return { error: "تعذر إرسال الإجابات. تحقق من الاتصال وحاول مرة أخرى." };
  revalidatePath("/student", "layout");
  redirect(`/student/quiz/${parsedQuiz.data}/result?attempt=${attemptId}`);
}

export async function markAllNotificationsRead(): Promise<void> {
  const { userId } = await requireActiveStudent();
  const supabase = await createClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("student_id", userId).is("read_at", null);
  revalidatePath("/student", "layout");
}
