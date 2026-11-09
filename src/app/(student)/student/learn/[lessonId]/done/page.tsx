import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { z } from "zod";
import { badges, statsFromXp } from "@shared/gamification/xp";
import { fetchActivityDates } from "@shared/data/student";
import { watering } from "@shared/student/watering";
import { yemenDate } from "@shared/student/stats";
import { LessonReward } from "@/components/lesson/lesson-reward";
import { requireActiveStudent } from "@/lib/auth/session";
import { getXpRows } from "@/lib/gamification/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "أحسنت!" };

/** After a lesson: the reward chain (drops, watering, league, a new badge if any), then the next step. */
export default async function LessonDonePage({ params, searchParams }: PageProps<"/student/learn/[lessonId]/done">) {
  const [{ lessonId }, sp] = await Promise.all([params, searchParams]);
  const { userId } = await requireActiveStudent();
  const next = typeof sp.next === "string" && sp.next.startsWith("/student") ? sp.next : "/student";
  if (!z.uuid().safeParse(lessonId).success) redirect(next);
  const supabase = await createClient();
  const [{ data: done }, xpRows, activity, { data: league }] = await Promise.all([
    supabase.from("lesson_progress").select("lesson_id").eq("student_id", userId).eq("lesson_id", lessonId).eq("status", "completed").maybeSingle(),
    getXpRows(userId),
    fetchActivityDates(supabase, userId),
    supabase.rpc("weekly_league", { p_scope: "all" }),
  ]);
  if (!done) redirect(next);
  const water = watering(activity);
  const total = xpRows.reduce((s, r) => s + r.points, 0);
  const today = yemenDate(new Date());
  const earned = xpRows.filter((r) => yemenDate(r.created_at) === today).reduce((s, r) => s + r.points, 0);
  const me = (league as { me?: { rank: number; xp: number; joined: boolean } } | null)?.me;
  const earnedBadges = badges(statsFromXp(xpRows, water.days))
    .filter((b) => b.earned)
    .map((b) => ({ id: b.id, title: b.title, description: b.description, icon: b.icon }));
  return (
    <LessonReward next={next} total={total} earned={earned} watering={water} league={me?.joined ? { rank: me.rank, xp: me.xp } : null} badges={earnedBadges} />
  );
}
