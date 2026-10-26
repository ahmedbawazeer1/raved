import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, MessageCircleQuestion } from "lucide-react";
import { En } from "@/components/en";
import { MixedText } from "@/components/mixed-text";
import { LessonBlocks } from "@/components/lesson/lesson-blocks";
import { LessonFeedback } from "@/components/lesson/lesson-feedback";
import { TaskPreview } from "@/components/lesson/task-preview";
import { TopBar } from "@/components/student/top-bar";
import { SubmitButton } from "@/components/ui/submit-button";
import { requireActiveStudent } from "@/lib/auth/session";
import { parseFeatures } from "@/lib/paths/features";
import { createClient } from "@/lib/supabase/server";
import type { LessonBlock, PackageLesson } from "@/lib/content/types";
import { completeLesson } from "../../actions";

export const metadata: Metadata = { title: "الدرس" };

export default async function LessonPage({ params }: PageProps<"/student/learn/[lessonId]">) {
  const { lessonId } = await params;
  const { userId } = await requireActiveStudent();
  const supabase = await createClient();

  const { data: lesson } = await supabase
    .from("lessons")
    .select("id, unit_id, title, skill, position, blocks, speaking_task, writing_task, units(id, title, position, quizzes(id, kind), levels(code, paths(slug, features)))")
    .eq("id", lessonId)
    .maybeSingle();
  if (!lesson || !lesson.units) notFound();

  const [{ data: siblings }, { data: progress }] = await Promise.all([
    supabase.from("lessons").select("id, position").eq("unit_id", lesson.unit_id).order("position"),
    supabase.from("lesson_progress").select("status, rating").eq("student_id", userId).eq("lesson_id", lesson.id).maybeSingle(),
  ]);
  const ordered = siblings ?? [];
  const index = ordered.findIndex((l) => l.id === lesson.id);
  const next = ordered[index + 1];
  const unit = lesson.units;
  const slug = unit.levels?.paths?.slug ?? "";
  const unitHref = `/student/${slug}/unit/${unit.id}`;
  const quizId = (unit.quizzes ?? []).find((q) => q.kind === "unit")?.id;
  const nextHref = next ? `/student/learn/${next.id}` : quizId ? `/student/quiz/${quizId}` : unitHref;
  const completed = progress?.status === "completed";
  const features = parseFeatures(unit.levels?.paths?.features);

  return (
    <>
      <TopBar
        backHref={unitHref}
        subtitle={
          <>
            الوحدة {unit.position} · الدرس {index + 1} من {ordered.length}
          </>
        }
        title={<MixedText text={lesson.title} />}
      />
      <main className="mx-auto flex w-full max-w-[680px] flex-col gap-4 px-4 py-5">
        <LessonBlocks blocks={(lesson.blocks ?? []) as unknown as LessonBlock[]} />
        <TaskPreview
          lessonId={lesson.id}
          speaking={features.speaking ? (lesson.speaking_task as PackageLesson["speaking_task"] | null) : null}
          writing={features.writing ? (lesson.writing_task as PackageLesson["writing_task"] | null) : null}
        />
        <Link
          href={`/student/learn/${lesson.id}/assistant`}
          className="flex min-h-12 items-center gap-3 rounded-2xl border border-ai-tint bg-card px-4 py-3 text-foreground no-underline hover:text-foreground"
        >
          <MessageCircleQuestion className="size-6 flex-none text-ai" aria-hidden="true" />
          <span className="flex-1">
            <span className="block font-semibold">عندك سؤال؟ اسأل المساعد</span>
            <span className="block text-[13px] text-muted-foreground">يشرح هذا الدرس بالعربية · يحتاج اتصالاً</span>
          </span>
        </Link>
        <LessonFeedback lessonId={lesson.id} initialRating={progress?.rating ?? null} />
      </main>
      <footer className="sticky bottom-[68px] border-t border-border bg-card px-4 pt-3 pb-4 md:bottom-0">
        <form action={completeLesson} className="mx-auto max-w-[680px]">
          <input type="hidden" name="lesson_id" value={lesson.id} />
          <input type="hidden" name="next" value={nextHref} />
          <SubmitButton className="min-h-13 w-full" pendingLabel="جارٍ الحفظ…">
            {completed && <CheckCircle2 className="size-5" aria-hidden="true" />}
            {completed ? "مكتمل · التالي" : next ? "أكملت الدرس · التالي" : quizId ? "أكملت الدرس · إلى الاختبار" : "أكملت الدرس"}
          </SubmitButton>
          <p className="mt-1.5 text-center text-xs text-muted-foreground">
            الوحدة: <En>{unit.title}</En>
          </p>
        </form>
      </footer>
    </>
  );
}
