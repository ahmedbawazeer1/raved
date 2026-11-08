import { z } from "zod";
import { answerPlacement } from "@/app/(auth)/placement/actions";
import { appRoute, jsonBody } from "@/lib/api/app-route";
import { requireActiveStudent } from "@/lib/auth/session";
import { parseFeatures } from "@/lib/paths/features";
import { canRetake, initialState } from "@/lib/placement/engine";
import { loadBank, parseState } from "@/lib/placement/server";
import { getPrimaryPath } from "@/lib/student/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const input = z.discriminatedUnion("action", [
  z.object({ action: z.literal("state") }),
  z.object({ action: z.literal("start") }),
  z.object({ action: z.literal("answer"), attemptId: z.uuid(), questionId: z.uuid(), answer: z.number().int().min(0).max(9).nullable() }),
]);

/** Where the student is in the placement test (the answer bank never leaves the server). */
async function placementState(userId: string) {
  const path = await getPrimaryPath(userId);
  if (!path || !parseFeatures(path.features).placement) return { status: "unavailable" as const };
  const supabase = await createClient();
  const { data: attempts } = await supabase
    .from("placement_attempts")
    .select("id, status, state, completed_at, overall_level, eta_months")
    .eq("student_id", userId)
    .eq("path_id", path.id)
    .order("created_at", { ascending: false })
    .limit(5);
  const open = attempts?.find((a) => a.status === "in_progress");
  if (open) {
    const state = parseState(open.state);
    const bank = await loadBank(path.id);
    const question = state?.currentQuestionId ? bank.views.get(state.currentQuestionId) : undefined;
    if (state && question) return { status: "in_progress" as const, attemptId: open.id, question, answered: state.answers.length, pathId: path.id };
  }
  const last = attempts?.find((a) => a.status === "completed");
  if (last && !canRetake(last.completed_at ? new Date(last.completed_at) : null, new Date())) {
    return { status: "completed" as const, level: last.overall_level, etaMonths: last.eta_months };
  }
  return { status: "ready" as const, retake: Boolean(last), pathId: path.id };
}

/** The placement test for the mobile app: state, start, answer (graded here, as on the website). */
export async function POST(request: Request) {
  const parsed = input.safeParse(await jsonBody(request));
  return appRoute(async () => {
    if (!parsed.success) return { error: "طلب غير صالح." };
    const { userId } = await requireActiveStudent();
    if (parsed.data.action === "answer") return answerPlacement(parsed.data);
    if (parsed.data.action === "start") {
      const now = await placementState(userId);
      if (now.status !== "ready") return now;
      const bank = await loadBank(now.pathId);
      const state = initialState(bank.questions);
      if (state.finished) return { status: "unavailable" as const };
      const { error } = await createAdminClient()
        .from("placement_attempts")
        .insert({ student_id: userId, path_id: now.pathId, state: state as never });
      // A second device may have started one at the same moment (unique index): just resume it.
      if (error && error.code !== "23505") return { error: "تعذر بدء الاختبار. حاول مرة أخرى." };
    }
    return placementState(userId);
  });
}
