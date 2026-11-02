import type { Metadata } from "next";
import Link from "next/link";
import { Bell, Layers, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { En } from "@/components/en";
import { CompanionGreeting } from "@/components/art/companion-greeting";
import { Hud } from "@/components/student/hud";
import { DailyQuests } from "@/components/student/daily-quests";
import { dailyQuests } from "@/lib/gamification/quests";
import { MistakesLink } from "@/components/student/mistakes-link";
import { JourneyMap } from "@/components/student/journey-map";
import { ProgressBar } from "@/components/student/progress-bar";
import { getXpRows } from "@/lib/gamification/queries";
import { requireActiveStudent } from "@/lib/auth/session";
import { parseFeatures } from "@/lib/paths/features";
import { getCurriculum, getPrimaryPath } from "@/lib/student/queries";
import { nextStep } from "@/lib/student/progress";
import { streakDays } from "@/lib/student/stats";
import { createClient } from "@/lib/supabase/server";
import { getVocabDeck } from "@/lib/vocab/queries";

export const metadata: Metadata = { title: "اليوم" };

function greeting(): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      hour12: false,
      timeZone: "Asia/Aden",
    }).format(new Date()),
  );
  return hour < 12 ? "صباح الخير" : "مساء الخير";
}

export default async function TodayPage() {
  const { profile, userId } = await requireActiveStudent();
  const path = await getPrimaryPath(userId);
  const curriculum = path ? await getCurriculum(userId, path.id) : null;
  const step = curriculum ? nextStep(curriculum.units, curriculum) : { kind: "empty" as const };
  const supabase = await createClient();
  const { count: unread } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("student_id", userId).is("read_at", null);

  const features = parseFeatures(path?.features);
  const [{ data: placement }, deck, xpRows, activity] = await Promise.all([
    path && features.placement
      ? supabase
          .from("placement_attempts")
          .select("status")
          .eq("student_id", userId)
          .eq("path_id", path.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    path && features.vocab ? getVocabDeck(userId, path.id) : Promise.resolve(null),
    getXpRows(userId),
    Promise.all([
      supabase.from("lesson_progress").select("completed_at").eq("student_id", userId).eq("status", "completed"),
      supabase.from("quiz_attempts").select("created_at").eq("student_id", userId),
      supabase.from("vocab_reviews").select("last_reviewed_at").eq("student_id", userId),
    ]),
  ]);
  const [lessonDays, quizDays, vocabDays] = activity;
  const streak = streakDays([
    ...(lessonDays.data ?? []).map((r) => r.completed_at),
    ...(quizDays.data ?? []).map((r) => r.created_at),
    ...(vocabDays.data ?? []).map((r) => r.last_reviewed_at),
  ]);
  const xp = xpRows.reduce((sum, r) => sum + r.points, 0);
  const placementCard = path && features.placement && placement?.status !== "completed";
  const vocabToday = deck ? deck.cards.length : 0;

  const unit = step.kind === "lesson" || step.kind === "quiz" ? step.unit : null;
  const lessons = unit ? unit.lessons : [];
  const done = unit ? unit.lessonsDone : 0;
  const levelCode = unit?.levelCode ?? curriculum?.units.at(-1)?.levelCode;
  const mapUnits = curriculum ? curriculum.units.filter((u) => u.levelCode === levelCode) : [];
  const first = profile.full_name.split(" ")[0];
  const bubble =
    step.kind === "lesson" || step.kind === "quiz"
      ? `${greeting()} يا ${first}! محطتك اليوم: ${unit?.stop ?? `الوحدة ${unit?.position}`}. ${step.kind === "quiz" ? "الحارس في انتظارك ⚔️" : "يلا نكمل الرحلة 🚀"}`
      : `${greeting()} يا ${first}!`;
  const href = step.kind === "lesson" ? `/student/learn/${step.lessonId}` : step.kind === "quiz" ? `/student/quiz/${step.quizId}` : null;

  return (
    <main className="mx-auto flex w-full max-w-[640px] flex-col gap-4 px-4 py-5">
      <header className="flex items-center gap-2">
        <h1 className="sr-only">اليوم</h1>
        <div className="min-w-0 flex-1">
          <Hud streak={streak} xp={xp} />
        </div>
        <Link
          href="/student/notifications"
          aria-label={unread ? `الإشعارات، ${unread} جديدة` : "الإشعارات"}
          className="relative flex size-11 flex-none items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm"
        >
          <Bell className="size-5" aria-hidden="true" />
          {Boolean(unread) && <span className="absolute end-2 top-2 size-2.5 rounded-full bg-accent" />}
        </Link>
      </header>

      <CompanionGreeting>{bubble}</CompanionGreeting>

      {placementCard && (
        <Card className="flex items-center gap-3 border-accent p-4">
          <Target className="size-8 flex-none text-accent" aria-hidden="true" />
          <div className="flex-1">
            <p className="font-bold">{placement ? "أكمل اختبار المستوى" : "حدّد مستواك أولاً"}</p>
            <p className="text-[13px] text-muted-foreground">{placement ? "تكمل من نفس السؤال." : "20 دقيقة تقريباً، لتبدأ من الوحدة المناسبة لك."}</p>
          </div>
          <Button asChild size="sm" variant="accent">
            <Link href="/placement">{placement ? "أكمل" : "ابدأ"}</Link>
          </Button>
        </Card>
      )}

      {step.kind === "empty" && (
        <Card className="p-5">
          <p className="font-bold">الدروس قيد الإعداد</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">سننشر أول وحدة قريباً، وسنبلغك هنا عندما تجهز.</p>
        </Card>
      )}

      {step.kind === "finished" && (
        <Card className="p-5">
          <p className="font-bold">أنهيت كل الوحدات المنشورة 🎉</p>
          <p className="mt-1 text-sm text-muted-foreground">وحدات جديدة في الطريق. راجع ما تعلمته حتى ذلك الحين.</p>
        </Card>
      )}

      {unit && href && (
        <section className="relative flex flex-col gap-3 overflow-hidden rounded-3xl bg-[radial-gradient(120%_90%_at_85%_0%,#18A383_0%,#0E6E5C_45%,#08392F_100%)] p-5 text-white">
          <p className="text-sm text-primary-tint">جلسة اليوم · {profile.daily_goal_minutes} دقيقة</p>
          <h2 className="text-xl font-bold">
            {unit.stop ? `${unit.stop} · ` : ""}الوحدة {unit.position}: <En>{unit.title}</En>
          </h2>
          <div className="flex items-center gap-3 [&_[role=progressbar]]:bg-white/25 [&_[role=progressbar]>span]:bg-accent">
            <ProgressBar value={done} max={lessons.length} label="تقدم الوحدة" />
            <span className="text-sm whitespace-nowrap text-primary-tint">
              {done} من {lessons.length}
            </span>
          </div>
          <Button asChild variant="accent" size="lg" className="shadow-[0_5px_0_#C98210] active:translate-y-[5px] active:shadow-none">
            <Link href={href}>{step.kind === "quiz" ? "واجه حارس المحطة" : done === 0 ? "ابدأ جلسة اليوم" : "أكمل جلسة اليوم"}</Link>
          </Button>
        </section>
      )}

      {path && <DailyQuests quests={dailyQuests(xpRows, features)} />}

      {path && mapUnits.length > 0 && <JourneyMap units={mapUnits} pathSlug={path.slug} />}

      <nav aria-label="تحديات" className="grid grid-cols-3 gap-2">
        {[
          { href: "/student/league", icon: "🏆", label: "الدوري" },
          { href: "/student/duel", icon: "⚔️", label: "تحدي صديق" },
          { href: "/student/practice/games", icon: "🎮", label: "الألعاب" },
        ].map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-2xl border border-border bg-card text-sm font-semibold text-foreground no-underline hover:border-primary hover:text-foreground"
          >
            <span className="text-xl" aria-hidden="true">
              {l.icon}
            </span>
            {l.label}
          </Link>
        ))}
      </nav>

      <MistakesLink />

      {vocabToday > 0 && (
        <Link
          href="/student/vocab"
          className="flex min-h-14 items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-foreground no-underline hover:text-foreground"
        >
          <Layers className="size-6 flex-none text-primary" aria-hidden="true" />
          <span className="flex-1">
            <span className="block font-semibold">مراجعة المفردات</span>
            <span className="block text-[13px] text-muted-foreground">{vocabToday} كلمة اليوم · تعمل بلا إنترنت</span>
          </span>
          <Badge>{vocabToday}</Badge>
        </Link>
      )}

      {path && (
        <Link href={`/student/${path.slug}`} className="text-sm">
          كل المستويات ←
        </Link>
      )}
    </main>
  );
}
