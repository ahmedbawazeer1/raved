import type { Metadata } from "next";
import Link from "next/link";
import { Bell, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DailyQuests } from "@/components/student/daily-quests";
import { dailyQuests } from "@/lib/gamification/quests";
import { MistakesLink } from "@/components/student/mistakes-link";
import { WateringWeek } from "@/components/student/watering-card";
import { TodayStage, type StageLesson } from "@/components/student/today-stage";
import { stageFor } from "@shared/art/rafed";
import { AVATAR_ITEMS } from "@shared/art/avatar";
import { AvatarGift } from "@/components/student/avatar-gift";
import { getAvatarProgress } from "@/lib/student/avatar-progress";
import { watering as wateringOf } from "@shared/student/watering";
import { getXpRows } from "@/lib/gamification/queries";
import { requireActiveStudent } from "@/lib/auth/session";
import { parseFeatures } from "@/lib/paths/features";
import { getCurriculum, getPrimaryPath } from "@/lib/student/queries";
import { nextStep } from "@/lib/student/progress";
import { createClient } from "@/lib/supabase/server";
import { getVocabDeck } from "@/lib/vocab/queries";

export const metadata: Metadata = { title: "اليوم" };

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
  const studied = [
    ...(lessonDays.data ?? []).map((r) => r.completed_at),
    ...(quizDays.data ?? []).map((r) => r.created_at),
    ...(vocabDays.data ?? []).map((r) => r.last_reviewed_at),
  ];
  const water = wateringOf(studied);
  const levelsDone = curriculum
    ? new Set(curriculum.units.map((u) => u.levelCode)).size - new Set(curriculum.units.filter((u) => u.state !== "done").map((u) => u.levelCode)).size
    : 0;
  const stage = stageFor(levelsDone);
  const avatarProgress = await getAvatarProgress(userId, { activity: studied, pathDone: step.kind === "finished" });
  // Glasses are there from the start: only items earned later come as a gift.
  const unlocked = AVATAR_ITEMS.filter((i) => i.key !== "glasses" && i.unlocked(avatarProgress)).map((i) => i.key);
  const xp = xpRows.reduce((sum, r) => sum + r.points, 0);
  const placementCard = path && features.placement && placement?.status !== "completed";
  const vocabToday = deck ? deck.cards.length : 0;

  const unit = step.kind === "lesson" || step.kind === "quiz" ? step.unit : null;
  const lessons = unit ? unit.lessons : [];
  const done = unit ? unit.lessonsDone : 0;
  const levelCode = unit?.levelCode ?? curriculum?.units.at(-1)?.levelCode;
  const mapUnits = curriculum ? curriculum.units.filter((u) => u.levelCode === levelCode) : [];
  const href = step.kind === "lesson" ? `/student/learn/${step.lessonId}` : step.kind === "quiz" ? `/student/quiz/${step.quizId}` : null;

  const quests = path ? dailyQuests(xpRows, features) : [];
  const lessonInfo: StageLesson = unit
    ? { kind: step.kind === "quiz" ? "quiz" : "lesson", href, position: unit.position, title: unit.title, done, total: lessons.length }
    : { kind: step.kind === "finished" ? "finished" : "empty", href: null };
  // No units yet: an empty river with locked pads, so the screen still looks like the real thing.
  const stageUnits = mapUnits.length
    ? mapUnits
    : ([1, 2, 3].map((n) => ({ id: `soon-${n}`, position: n, title: "", state: "locked" })) as unknown as typeof mapUnits);

  const sheet = (
    <>
      <section aria-label="سقاية هذا الأسبوع" className="flex flex-col gap-2 rounded-3xl border border-border bg-card p-4">
        <p className="font-bold">سقاية هذا الأسبوع</p>
        <WateringWeek watering={water} />
      </section>

      {path && <DailyQuests quests={quests} />}

      <nav aria-label="تحديات" className="grid grid-cols-4 gap-2">
        {[
          { href: "/student/league", icon: "🏆", label: "الدوري" },
          { href: "/student/duel", icon: "⚔️", label: "تحدي صديق" },
          { href: "/student/arena", icon: "🎮", label: "الساحة" },
          { href: "/student/progress", icon: "🏅", label: "تقدّمي" },
        ].map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-2xl border-2 border-border bg-card text-center text-xs font-semibold text-foreground no-underline shadow-[0_3px_0_var(--color-border)] hover:border-primary hover:text-foreground"
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
            <span className="block text-[13px] text-muted-foreground">{vocabToday} كلمة اليوم</span>
          </span>
          <Badge>{vocabToday}</Badge>
        </Link>
      )}

      <Link
        href="/student/notifications"
        className="flex min-h-14 items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-foreground no-underline hover:text-foreground"
      >
        <Bell className="size-6 flex-none text-primary" aria-hidden="true" />
        <span className="flex-1 font-semibold">الإشعارات</span>
        {Boolean(unread) && <Badge tone="warning">{unread}</Badge>}
      </Link>

      {path && (
        <Link href={`/student/${path.slug}`} className="py-1 text-sm">
          كل المستويات ←
        </Link>
      )}
    </>
  );

  return (
    <>
      <AvatarGift unlocked={unlocked} />
      <TodayStage
        units={stageUnits}
        pathSlug={path?.slug ?? "english"}
        levelCode={levelCode ?? "A1"}
        stage={stage}
        watering={water}
        drops={xp}
        tier={profile.league_tier}
        lesson={lessonInfo}
        badge={quests.filter((q) => !q.done).length}
        placement={placementCard ? { started: Boolean(placement) } : null}
        sheet={sheet}
      />
    </>
  );
}
