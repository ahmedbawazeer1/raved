"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireActiveStudent } from "@/lib/auth/session";

const uuid = z.uuid();

/** Marks a lesson complete and goes to the next lesson (or back to the unit). */
export async function completeLesson(formData: FormData): Promise<void> {
  const { userId } = await requireActiveStudent();
  const lessonId = uuid.parse(formData.get("lesson_id"));
  const next = String(formData.get("next") ?? "");

  const supabase = await createClient();
  await supabase.from("lesson_progress").upsert(
    { student_id: userId, lesson_id: lessonId, status: "completed", completed_at: new Date().toISOString(), synced_at: new Date().toISOString() },
    { onConflict: "student_id,lesson_id" },
  );
  revalidatePath("/student", "layout");
  redirect(next.startsWith("/student") ? next : "/student");
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
