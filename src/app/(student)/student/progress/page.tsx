import type { Metadata } from "next";
import Link from "next/link";
import { Flame, Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { En } from "@/components/en";
import { EstimatePill } from "@/components/practice/feedback-parts";
import { ExamCards } from "@/components/student/exam-cards";
import { ProgressBar } from "@/components/student/progress-bar";
import { targetDateLabel, targetExamLabel } from "@/lib/apply/options";
import { requireActiveStudent } from "@/lib/auth/session";
import { parseFeatures } from "@/lib/paths/features";
import { LEVELS, monthsToB2, SKILL_LABELS_AR, SKILLS, type Level } from "@/lib/placement/engine";
import { examTrackOpen, streakDays } from "@/lib/student/stats";
import { BadgeGrid } from "@/components/student/badge-grid";
import { XpBar } from "@/components/student/xp-bar";
import { getXpRows } from "@/lib/gamification/queries";
import { badges, statsFromXp } from "@/lib/gamification/xp";
import { getCurriculum, getPrimaryPath } from "@/lib/student/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "التقدم والامتحان" };

function months(n: number): string {
  return n === 1 ? "شهر واحد" : n === 2 ? "شهرين" : n <= 10 ? `${n} أشهر` : `${n} شهراً`;
}

export default async function ProgressPage() {
  const { userId, profile, application } = await requireActiveStudent();
  const path = await getPrimaryPath(userId);
  const supabase = await createClient();
  const curriculum = path ? await getCurriculum(userId, path.id) : null;
  const features = parseFeatures(path?.features);

  const [skills, placement, lessons, quizzes, words, speaking, writing, exams, levels, xpRows] = await Promise.all([
    path ? supabase.from("skill_estimates").select("skill, level").eq("student_id", userId).eq("path_id", path.id) : Promise.resolve({ data: [] }),
    path
      ? supabase
          .from("placement_attempts")
          .select("overall_level")
          .eq("student_id", userId)
          .eq("path_id", path.id)
          .eq("status", "completed")
          .order("completed_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("lesson_progress").select("completed_at").eq("student_id", userId).eq("status", "completed"),
    supabase.from("quiz_attempts").select("created_at, passed, quiz_id").eq("student_id", userId),
    supabase.from("vocab_reviews").select("last_reviewed_at").eq("student_id", userId),
    supabase.from("speaking_attempts").select("created_at").eq("student_id", userId),
    supabase.from("writing_submissions").select("created_at").eq("student_id", userId),
    features.exam_track
      ? supabase.from("exams").select("code, name, availability_ye, locations, fee_note, payment_note, official_practice_url, verified_at").order("position")
      : Promise.resolve({ data: [] }),
    path ? supabase.from("levels").select("code, est_hours").eq("path_id", path.id).eq("kind", "general") : Promise.resolve({ data: [] }),
    getXpRows(userId),
  ]);

  const streak = streakDays([
    ...(lessons.data ?? []).map((l) => l.completed_at),
    ...(quizzes.data ?? []).map((q) => q.created_at),
    ...(words.data ?? []).map((w) => w.last_reviewed_at),
    ...(speaking.data ?? []).map((s) => s.created_at),
    ...(writing.data ?? []).map((w) => w.created_at),
  ]);
  const passedQuizzes = new Set((quizzes.data ?? []).filter((q) => q.passed).map((q) => q.quiz_id)).size;
  const skillMap = new Map((skills.data ?? []).map((s) => [s.skill, s.level]));
  const overall = (placement.data?.overall_level ?? null) as Level | null;
  const hours = Object.fromEntries((levels.data ?? []).map((l) => [l.code, l.est_hours ?? 0]));
  const eta = overall ? monthsToB2(overall, hours, profile.daily_goal_minutes) : null;

  const kpis = [
    { label: "دروس مكتملة", value: (lessons.data ?? []).length },
    { label: "اختبارات ناجحة", value: passedQuizzes },
    { label: "كلمات راجعتها", value: (words.data ?? []).length },
    { label: "تدريبات محادثة وكتابة", value: (speaking.data ?? []).length + (writing.data ?? []).length },
  ];

  return (
    <main className="mx-auto flex w-full max-w-[720px] flex-col gap-4 px-4 py-5">
      <h1 className="text-2xl font-bold">التقدم والامتحان</h1>

      <Card className="flex flex-col gap-3 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">هدفك</p>
            <p className="text-lg font-bold">
              <En>{targetExamLabel(application?.target_exam)}</En>
              {application?.target_date ? ` · ${targetDateLabel(application.target_date)}` : ""}
            </p>
          </div>
          <span className="flex items-center gap-1.5 rounded-full bg-warning-tint px-3 py-1.5 text-sm font-semibold text-warning">
            <Flame className="size-4" aria-hidden="true" />
            {streak} {streak === 1 ? "يوم" : "أيام"} متتالية
          </span>
        </div>
        {/* CEFR timeline */}
        <div className="grid grid-cols-4 gap-1.5" dir="ltr">
          {LEVELS.map((l) => {
            const reached = overall && LEVELS.indexOf(l) <= LEVELS.indexOf(overall);
            return (
              <div key={l} className={`rounded-lg py-2 text-center font-en text-sm font-bold ${reached ? "bg-primary text-white" : "bg-muted text-subtle"}`}>
                {l}
              </div>
            );
          })}
        </div>
        <p className="text-sm text-muted-foreground">
          {overall
            ? eta
              ? `مستواك الآن ${overall}. بمعدل ${profile.daily_goal_minutes} دقيقة يومياً تصل B2 في حوالي ${months(eta)}.`
              : `مستواك الآن ${overall}.`
            : "لم تحدد مستواك بعد. "}
          {!overall && features.placement && <Link href="/placement">اختبر مستواك</Link>}
        </p>
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="flex flex-col gap-1 p-4">
            <span className="font-en text-2xl font-bold">{k.value}</span>
            <span className="text-xs text-muted-foreground">{k.label}</span>
          </Card>
        ))}
      </div>

      <XpBar xp={xpRows.reduce((sum, r) => sum + r.points, 0)} />
      <BadgeGrid badges={badges(statsFromXp(xpRows, streak))} />

      <Card className="flex flex-col gap-1 px-4 py-3">
        <div className="flex items-center justify-between pb-1">
          <h2 className="font-bold">مهاراتك</h2>
          <EstimatePill cefr={null} />
        </div>
        {SKILLS.map((s) => (
          <div key={s} className="flex items-center justify-between border-b border-muted py-2.5 text-sm last:border-b-0">
            <span>{SKILL_LABELS_AR[s]}</span>
            <En className="font-semibold">{skillMap.get(s) ?? "—"}</En>
          </div>
        ))}
        <p className="pt-1 text-xs text-muted-foreground">من اختبار المستوى، وترتفع عندما تنجح في اختبارات الوحدات.</p>
      </Card>

      {curriculum && curriculum.levels.length > 0 && (
        <Card className="flex flex-col gap-3 p-4">
          <h2 className="font-bold">خريطة الطريق</h2>
          {curriculum.levels.map((l) => {
            const units = curriculum.units.filter((u) => u.levelCode === l.code);
            const done = units.filter((u) => u.state === "done").length;
            return (
              <div key={l.id} className="flex items-center gap-3 text-sm">
                <En className="w-8 font-bold">{l.code}</En>
                <ProgressBar value={done} max={Math.max(units.length, 1)} label={`تقدم ${l.code}`} />
                <span className="w-20 text-start text-muted-foreground">
                  {units.length ? `${done} من ${units.length}` : "قريباً"}
                </span>
              </div>
            );
          })}
        </Card>
      )}

      {features.exam_track && (
        <>
          <Link
            href="/student/exam"
            className="flex min-h-14 items-center gap-3 rounded-2xl border border-border bg-card p-4 text-foreground no-underline hover:text-foreground"
          >
            {!examTrackOpen(overall) && <Lock className="size-5 text-muted-foreground" aria-hidden="true" />}
            <span className="flex-1 font-semibold">مسار الامتحان</span>
            <span className="text-sm text-muted-foreground">{examTrackOpen(overall) ? "مفتوح" : "يُفتح عند B1+"}</span>
          </Link>
          <h2 className="mt-2 font-bold">الامتحانات من اليمن</h2>
          <ExamCards exams={exams.data ?? []} />
        </>
      )}
    </main>
  );
}
