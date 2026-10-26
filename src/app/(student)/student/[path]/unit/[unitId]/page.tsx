import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Circle, PlayCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { En } from "@/components/en";
import { MixedText } from "@/components/mixed-text";
import { LessonIcon } from "@/components/student/lesson-icon";
import { ProgressBar } from "@/components/student/progress-bar";
import { TopBar } from "@/components/student/top-bar";
import { requireActiveStudent } from "@/lib/auth/session";
import { getCurriculum, getPrimaryPath } from "@/lib/student/queries";
import { formatBytes } from "@/lib/apply/compress";

export const metadata: Metadata = { title: "الوحدة" };

const NEEDS_NETWORK = new Set(["speaking"]);

export default async function UnitPage({ params }: PageProps<"/student/[path]/unit/[unitId]">) {
  const { path: slug, unitId } = await params;
  const { userId } = await requireActiveStudent();
  const path = await getPrimaryPath(userId);
  if (!path || path.slug !== slug) notFound();
  const curriculum = await getCurriculum(userId, path.id);
  const unit = curriculum.units.find((u) => u.id === unitId);
  if (!unit || unit.state === "locked") notFound();

  const lessons = [...unit.lessons].sort((a, b) => a.position - b.position);
  const nextLesson = lessons.find((l) => !curriculum.completedLessonIds.has(l.id));

  return (
    <>
      <TopBar
        backHref={`/student/${slug}?level=${unit.levelCode}`}
        subtitle={
          <>
            الوحدة {unit.position} · <En>{unit.levelCode}</En>
          </>
        }
        title={<En>{unit.title}</En>}
      />
      <main className="mx-auto flex w-full max-w-[640px] flex-col gap-4 px-4 py-5">
        <Card className="flex flex-col gap-2 p-4">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span>
              {unit.lessonsDone} من {lessons.length} دروس
            </span>
            {unit.sizeBytes && <Badge tone="muted">الحجم {formatBytes(unit.sizeBytes)}</Badge>}
          </div>
          <ProgressBar value={unit.lessonsDone} max={lessons.length} label="تقدم الوحدة" />
        </Card>

        <Card className="px-4 py-1.5">
          {lessons.map((l) => {
            const done = curriculum.completedLessonIds.has(l.id);
            const isNow = nextLesson?.id === l.id;
            return (
              <Link
                key={l.id}
                href={`/student/learn/${l.id}`}
                className="flex min-h-13 items-center gap-3 border-b border-muted py-2.5 text-sm text-foreground no-underline hover:text-foreground"
              >
                {done ? (
                  <CheckCircle2 className="size-5 text-success" aria-label="مكتمل" />
                ) : isNow ? (
                  <PlayCircle className="size-5 text-primary" aria-label="الآن" />
                ) : (
                  <Circle className="size-5 text-[#9AA8A4]" aria-hidden="true" />
                )}
                <span className="flex size-8 items-center justify-center rounded-lg bg-primary-tint text-primary">
                  <LessonIcon skill={l.skill} className="size-4" />
                </span>
                <span className={`flex-1 ${isNow ? "font-semibold" : ""}`}>
                  <MixedText text={l.title} />
                </span>
                {isNow && <Badge>الآن</Badge>}
                {NEEDS_NETWORK.has(l.skill) && !done && <Badge tone="muted">يحتاج اتصالاً</Badge>}
                {l.estMinutes && <span className="text-muted-foreground">{l.estMinutes} د</span>}
              </Link>
            );
          })}
          {unit.quizId && (
            <Link
              href={`/student/quiz/${unit.quizId}`}
              className="flex min-h-13 items-center gap-3 py-2.5 text-sm text-foreground no-underline hover:text-foreground"
            >
              {unit.quizPassed ? (
                <CheckCircle2 className="size-5 text-success" aria-label="ناجح" />
              ) : (
                <Circle className="size-5 text-[#9AA8A4]" aria-hidden="true" />
              )}
              <span className="flex size-8 items-center justify-center rounded-lg bg-warning-tint text-warning">
                <LessonIcon skill="quiz" className="size-4" />
              </span>
              <span className="flex-1 font-semibold">اختبار الوحدة</span>
              {unit.quizPassed && <Badge tone="success">نجحت</Badge>}
            </Link>
          )}
        </Card>
      </main>
    </>
  );
}
