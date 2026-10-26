"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireActiveStudent } from "@/lib/auth/session";
import { parseFeatures } from "@/lib/paths/features";
import { applyAnswer, canRetake, initialState } from "@/lib/placement/engine";
import { finishAttempt, loadBank, parseState, type PlacementQuestionView } from "@/lib/placement/server";
import { getPrimaryPath } from "@/lib/student/queries";
import { createAdminClient } from "@/lib/supabase/admin";

async function placementPath(userId: string) {
  const path = await getPrimaryPath(userId);
  if (!path || !parseFeatures(path.features).placement) redirect("/student");
  return path;
}

/** Starts (or resumes) the placement test of the student's primary path. */
export async function startPlacement(): Promise<void> {
  const { userId } = await requireActiveStudent();
  const path = await placementPath(userId);
  const admin = createAdminClient();

  const { data: attempts } = await admin
    .from("placement_attempts")
    .select("id, status, completed_at")
    .eq("student_id", userId)
    .eq("path_id", path.id)
    .order("created_at", { ascending: false })
    .limit(5);
  if (attempts?.some((a) => a.status === "in_progress")) redirect("/placement");
  const last = attempts?.find((a) => a.status === "completed");
  if (last && !canRetake(last.completed_at ? new Date(last.completed_at) : null, new Date())) redirect("/placement/result");

  const bank = await loadBank(path.id);
  const state = initialState(bank.questions);
  if (state.finished) redirect("/student");
  const { error } = await admin.from("placement_attempts").insert({ student_id: userId, path_id: path.id, state: state as never });
  // A second tab may have started one at the same moment (unique index): just resume it.
  if (error && error.code !== "23505") throw error;
  redirect("/placement");
}

export type AnswerResult =
  | { ok: true; done: false; question: PlacementQuestionView; answered: number }
  | { ok: true; done: true }
  | { ok: false; error: string };

const answerInput = z.object({
  attemptId: z.uuid(),
  questionId: z.uuid(),
  answer: z.number().int().min(0).max(9).nullable(),
});

/** Saves one answer (graded here, never in the browser) and returns the next question. */
export async function answerPlacement(input: z.infer<typeof answerInput>): Promise<AnswerResult> {
  const parsed = answerInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "حدث خطأ. حدّث الصفحة." };
  const { userId, profile } = await requireActiveStudent();
  const { attemptId, questionId, answer } = parsed.data;
  const admin = createAdminClient();

  const { data: attempt } = await admin
    .from("placement_attempts")
    .select("id, path_id, status, state")
    .eq("id", attemptId)
    .eq("student_id", userId)
    .maybeSingle();
  if (!attempt) return { ok: false, error: "لم نجد اختبارك. حدّث الصفحة." };
  if (attempt.status === "completed") return { ok: true, done: true };
  const state = parseState(attempt.state);
  if (!state) return { ok: false, error: "حدث خطأ. حدّث الصفحة." };

  const bank = await loadBank(attempt.path_id);
  const correct = bank.answers.get(questionId);
  const next = correct === undefined ? state : applyAnswer(state, bank.questions, questionId, answer, correct);

  if (next.finished) {
    await finishAttempt(attempt.id, userId, attempt.path_id, next, profile.daily_goal_minutes);
    revalidatePath("/student", "layout");
    return { ok: true, done: true };
  }
  if (next !== state) {
    const { error } = await admin.from("placement_attempts").update({ state: next as never }).eq("id", attempt.id);
    if (error) return { ok: false, error: "تعذر حفظ إجابتك. حاول مرة أخرى." };
  }
  const view = next.currentQuestionId ? bank.views.get(next.currentQuestionId) : undefined;
  if (!view) return { ok: false, error: "حدث خطأ. حدّث الصفحة." };
  return { ok: true, done: false, question: view, answered: next.answers.length };
}
