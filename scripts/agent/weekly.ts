/**
 * Weekly improvement check (GitHub Actions, Fridays). For every published unit it aggregates the
 * last 60 days of quiz results and lesson ratings — never a student's identity — into
 * public.unit_insights: pass rate, item analysis of every quiz question (difficulty, discrimination,
 * flag) and lessons rated "not useful". The content studio (/studio/insights) shows the flagged
 * units; the owner decides whether the factory rebuilds one with those notes.
 */
import { createClient } from "@supabase/supabase-js";
import { itemAnalysis } from "../../src/lib/agent/improve";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.log("Weekly check: Supabase secrets are not set, nothing to do.");
    return;
  }
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const since = new Date(Date.now() - 60 * 86400_000).toISOString();
  const { data: units, error } = await db.from("units").select("id, code, quizzes(id, kind), lessons(id, title)").eq("status", "published");
  if (error) throw error;

  let flaggedUnits = 0;
  for (const u of units ?? []) {
    const quizIds = (u.quizzes ?? []).filter((q) => q.kind === "unit").map((q) => q.id);
    const { data: attempts } = quizIds.length
      ? await db.from("quiz_attempts").select("results, correct, passed").in("quiz_id", quizIds).gte("created_at", since).limit(5000)
      : { data: [] as { results: unknown; correct: number; passed: boolean }[] };
    const lessonIds = (u.lessons ?? []).map((l) => l.id);
    const { data: ratings } = lessonIds.length
      ? await db.from("lesson_progress").select("lesson_id, rating").in("lesson_id", lessonIds).not("rating", "is", null)
      : { data: [] as { lesson_id: string; rating: string }[] };
    const lessons = (u.lessons ?? [])
      .map((l) => {
        const votes = (ratings ?? []).filter((r) => r.lesson_id === l.id);
        return { lesson: l.title, votes: votes.length, share: votes.length ? votes.filter((r) => r.rating === "not_useful").length / votes.length : 0 };
      })
      .filter((l) => l.votes > 0);
    const list = attempts ?? [];
    const items = itemAnalysis(list);
    const flagged = items.filter((i) => i.flag).length + lessons.filter((l) => l.votes >= 5 && l.share >= 0.3).length;
    if (flagged) flaggedUnits++;
    const { error: upErr } = await db.from("unit_insights").upsert({
      unit_id: u.id,
      attempts: list.length,
      pass_rate: list.length ? Math.round((list.filter((a) => a.passed).length / list.length) * 1000) / 1000 : 0,
      items,
      lessons,
      flagged,
      computed_at: new Date().toISOString(),
    });
    if (upErr) throw upErr;
  }
  console.log(`Weekly check: ${units?.length ?? 0} unit(s) analysed, ${flaggedUnits} with something to improve.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
