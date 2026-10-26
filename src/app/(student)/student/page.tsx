import type { Metadata } from "next";
import Link from "next/link";
import { Bell, CheckCircle2, Circle, Layers, PlayCircle, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { En } from "@/components/en";
import { MixedText } from "@/components/mixed-text";
import { ProgressBar } from "@/components/student/progress-bar";
import { requireActiveStudent } from "@/lib/auth/session";
import { parseFeatures } from "@/lib/paths/features";
import { getCurriculum, getPrimaryPath } from "@/lib/student/queries";
import { nextStep } from "@/lib/student/progress";
import { createClient } from "@/lib/supabase/server";
import { getVocabDeck } from "@/lib/vocab/queries";

export const metadata: Metadata = { title: "اليوم" };

function greeting(): string {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Asia/Aden" }).format(new Date()));
  return hour < 12 ? "صباح الخير" : "مساء الخير";
}

export default async function TodayPage() {
  const { profile, userId } = await requireActiveStudent();
  const path = await getPrimaryPath(userId);
  const curriculum = path ? await getCurriculum(userId, path.id) : null;
  const step = curriculum ? nextStep(curriculum.units, curriculum) : { kind: "empty" as const };
  const supabase = await createClient();
  const { count: unread } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("student_id", userId)
    .is("read_at", null);

  const features = parseFeatures(path?.features);
  const [{ data: placement }, deck] = await Promise.all([
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
  ]);
  const placementCard = path && features.placement && placement?.status !== "completed";
  const vocabToday = deck ? deck.cards.length : 0;

  const unit = step.kind === "lesson" || step.kind === "quiz" ? step.unit : null;
  const lessons = unit ? [...unit.lessons].sort((a, b) => a.position - b.position) : [];
  const done = unit ? unit.lessonsDone : 0;
  const href =
    step.kind === "lesson" ? `/student/learn/${step.lessonId}` : step.kind === "quiz" ? `/student/quiz/${step.quizId}` : null;

  return (
    <main className="mx-auto flex w-full max-w-[640px] flex-col gap-4 px-4 py-5">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{greeting()}</p>
          <h1 className="text-2xl font-bold">{profile.full_name.split(" ")[0]}</h1>
        </div>
        <Link
          href="/student/settings#notifications"
          aria-label={unread ? `الإشعارات، ${unread} جديدة` : "الإشعارات"}
          className="relative flex size-11 items-center justify-center rounded-full bg-card text-foreground"
        >
          <Bell className="size-5" aria-hidden="true" />
          {Boolean(unread) && <span className="absolute end-2 top-2 size-2.5 rounded-full bg-accent" />}
        </Link>
      </header>

      {placementCard && (
        <Card className="flex items-center gap-3 border-accent p-4">
          <Target className="size-8 flex-none text-accent" aria-hidden="true" />
          <div className="flex-1">
            <p className="font-bold">{placement ? "أكمل اختبار المستوى" : "حدّد مستواك أولاً"}</p>
            <p className="text-[13px] text-muted-foreground">
              {placement ? "تكمل من نفس السؤال." : "20 دقيقة تقريباً، لتبدأ من الوحدة المناسبة لك."}
            </p>
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
        <>
          <section className="flex flex-col gap-3 rounded-2xl bg-primary p-5 text-white">
            <p className="text-sm text-primary-tint">
              جلسة اليوم · {profile.daily_goal_minutes} دقيقة
            </p>
            <h2 className="text-xl font-bold">
              الوحدة {unit.position}: <En>{unit.title}</En>
            </h2>
            <div className="flex items-center gap-3 [&_[role=progressbar]]:bg-white/25 [&_[role=progressbar]>span]:bg-accent">
              <ProgressBar value={done} max={lessons.length} label="تقدم الوحدة" />
              <span className="text-sm text-primary-tint">
                {done} من {lessons.length}
              </span>
            </div>
            <Button asChild variant="accent" size="lg">
              <Link href={href}>{done === 0 ? "ابدأ جلسة اليوم" : "أكمل جلسة اليوم"}</Link>
            </Button>
          </section>

          <Card className="px-4 py-1.5">
            {lessons.map((l) => {
              const isDone = curriculum!.completedLessonIds.has(l.id);
              const isNow = step.kind === "lesson" && step.lessonId === l.id;
              return (
                <Link
                  key={l.id}
                  href={`/student/learn/${l.id}`}
                  className="flex min-h-12 items-center gap-3 border-b border-muted py-2.5 text-sm text-foreground no-underline last:border-b-0 hover:text-foreground"
                >
                  {isDone ? (
                    <CheckCircle2 className="size-5 text-success" aria-label="مكتمل" />
                  ) : isNow ? (
                    <PlayCircle className="size-5 text-primary" aria-label="الآن" />
                  ) : (
                    <Circle className="size-5 text-[#9AA8A4]" aria-hidden="true" />
                  )}
                  <span className={`flex-1 ${isDone ? "text-muted-foreground" : isNow ? "font-semibold" : ""}`}>
                    <MixedText text={l.title} />
                  </span>
                  {isNow && <Badge>الآن</Badge>}
                </Link>
              );
            })}
            {unit.quizId && (
              <Link
                href={`/student/quiz/${unit.quizId}`}
                className="flex min-h-12 items-center gap-3 py-2.5 text-sm text-foreground no-underline hover:text-foreground"
              >
                {step.kind === "quiz" ? <PlayCircle className="size-5 text-primary" aria-label="الآن" /> : <Circle className="size-5 text-[#9AA8A4]" aria-hidden="true" />}
                <span className={`flex-1 ${step.kind === "quiz" ? "font-semibold" : ""}`}>اختبار الوحدة</span>
                {step.kind === "quiz" && <Badge>الآن</Badge>}
              </Link>
            )}
          </Card>
        </>
      )}

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
          كل الوحدات ←
        </Link>
      )}
    </main>
  );
}
