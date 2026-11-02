/**
 * Weekly self-improvement check of «عقل رفد» (GitHub Actions, Fridays). For every published unit,
 * aggregates quiz results and lesson ratings (no student identities) and queues an improve_unit
 * job when students clearly struggle. The owner reviews every proposal before it is published.
 */
import { createClient } from "@supabase/supabase-js";
import { needsImprovement, questionStats, type UnitStats } from "../../src/lib/agent/improve";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.log("Weekly check: Supabase secrets are not set, nothing to do.");
    return;
  }
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const since = new Date(Date.now() - 60 * 86400_000).toISOString();
  const { data: units, error } = await db.from("units").select("id, code, levels(path_id), quizzes(id, kind), lessons(id, title)").eq("status", "published");
  if (error) throw error;

  let queued = 0;
  for (const u of units ?? []) {
    const quizIds = (u.quizzes ?? []).filter((q) => q.kind === "unit").map((q) => q.id);
    if (quizIds.length === 0) continue;
    const { data: attempts } = await db.from("quiz_attempts").select("results, passed").in("quiz_id", quizIds).gte("created_at", since).limit(2000);
    const lessonIds = (u.lessons ?? []).map((l) => l.id);
    const { data: ratings } = lessonIds.length
      ? await db.from("lesson_progress").select("lesson_id, rating").in("lesson_id", lessonIds).not("rating", "is", null)
      : { data: [] as { lesson_id: string; rating: string }[] };
    const lessonsNotUseful = (u.lessons ?? []).map((l) => {
      const votes = (ratings ?? []).filter((r) => r.lesson_id === l.id);
      return { lesson: l.title, votes: votes.length, share: votes.length ? votes.filter((r) => r.rating === "not_useful").length / votes.length : 0 };
    });
    const stats: UnitStats = { ...questionStats(attempts ?? []), lessonsNotUseful: lessonsNotUseful.filter((l) => l.votes > 0) };
    if (!needsImprovement(stats)) continue;

    const recent = new Date(Date.now() - 14 * 86400_000).toISOString();
    const { data: open } = await db
      .from("agent_jobs")
      .select("id")
      .eq("kind", "improve_unit")
      .contains("input", { unit_id: u.id })
      .or(`status.in.(queued,running,needs_review),created_at.gte.${recent}`)
      .limit(1);
    if (open?.length) continue;
    const pathId = (u.levels as unknown as { path_id: string } | null)?.path_id;
    if (!pathId) continue;
    await db.from("agent_jobs").insert({ kind: "improve_unit", path_id: pathId, input: { unit_id: u.id, unit_code: u.code, stats } });
    queued++;
  }
  console.log(`Weekly check: ${queued} unit(s) queued for improvement.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
