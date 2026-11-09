import "server-only";
import type { AvatarProgress } from "@shared/art/avatar";
import { longestWatering } from "@shared/student/watering";
import { createClient } from "@/lib/supabase/server";

/** Real progress that unlocks avatar items (never bought). `activity` = study timestamps when already loaded. */
export async function getAvatarProgress(userId: string, opts: { activity?: (string | null)[]; pathDone?: boolean } = {}): Promise<AvatarProgress> {
  const supabase = await createClient();
  const [{ data: passed }, { data: server }, activity] = await Promise.all([
    supabase.from("quiz_attempts").select("quiz_id, quizzes!inner(kind)").eq("student_id", userId).eq("passed", true),
    supabase.rpc("my_avatar_progress"),
    opts.activity
      ? Promise.resolve(opts.activity)
      : Promise.all([
          supabase.from("lesson_progress").select("completed_at").eq("student_id", userId).eq("status", "completed"),
          supabase.from("quiz_attempts").select("created_at").eq("student_id", userId),
          supabase.from("vocab_reviews").select("last_reviewed_at").eq("student_id", userId),
        ]).then(([l, q, v]) => [
          ...(l.data ?? []).map((r) => r.completed_at),
          ...(q.data ?? []).map((r) => r.created_at),
          ...(v.data ?? []).map((r) => r.last_reviewed_at),
        ]),
  ]);
  const passedOf = (kind: string) => new Set((passed ?? []).filter((p) => p.quizzes?.kind === kind).map((p) => p.quiz_id)).size;
  const s = (server ?? {}) as { games_won?: number; champion?: boolean };
  return {
    unitsPassed: passedOf("unit"),
    levelsDone: passedOf("level_end"),
    gamesWon: s.games_won ?? 0,
    bestWatering: longestWatering(activity),
    champion: Boolean(s.champion),
    pathDone: Boolean(opts.pathDone),
  };
}
