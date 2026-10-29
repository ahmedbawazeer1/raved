import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Lock, MessageCircleQuestion } from "lucide-react";
import { En } from "@/components/en";
import { MixedText } from "@/components/mixed-text";
import { LessonBlocks } from "@/components/lesson/lesson-blocks";
import { LessonFeedback } from "@/components/lesson/lesson-feedback";
import { TaskPreview } from "@/components/lesson/task-preview";
import { TopBar } from "@/components/student/top-bar";
import { Button } from "@/components/ui/button";
import { LessonGate, type GateTask } from "@/components/lesson/lesson-gate";
import type { VideoStatus } from "@/components/lesson/video-block";
import { getAiSettings } from "@/lib/ai/limits";
import { requireActiveStudent } from "@/lib/auth/session";
import { parseFeatures } from "@/lib/paths/features";
import { createClient } from "@/lib/supabase/server";
import type { LessonBlock, PackageLesson } from "@/lib/content/types";

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

  const blocks = (lesson.blocks ?? []) as unknown as LessonBlock[];
  const trackedVideos = [...new Set(blocks.flatMap((b) => (b.type === "video" && b.youtube_id && !b.needs_check ? [b.youtube_id] : [])))];
  const exerciseIds = blocks.flatMap((b) => (b.type === "exercise" && b.exercise ? [b.exercise.id] : []));

  const [{ data: siblings }, { data: progress }, { data: blocker }, { data: views }, { data: speakingDone }, { data: writingDone }, ai] =
    await Promise.all([
      supabase.from("lessons").select("id, position").eq("unit_id", lesson.unit_id).order("position"),
      supabase.from("lesson_progress").select("status, rating").eq("student_id", userId).eq("lesson_id", lesson.id).maybeSingle(),
      supabase.rpc("my_lesson_blocker", { p_lesson_id: lesson.id }),
      trackedVideos.length
        ? supabase.from("video_views").select("youtube_id, watched_sec, duration_sec, completed_at").eq("student_id", userId).in("youtube_id", trackedVideos)
        : Promise.resolve({ data: [] as { youtube_id: string; watched_sec: number; duration_sec: number; completed_at: string | null }[] }),
      supabase.from("speaking_attempts").select("id").eq("student_id", userId).eq("lesson_id", lesson.id).limit(1),
      supabase.from("writing_submissions").select("id").eq("student_id", userId).eq("lesson_id", lesson.id).limit(1),
      getAiSettings(),
    ]);
  const ordered = siblings ?? [];
  const index = ordered.findIndex((l) => l.id === lesson.id);
  const next = ordered[index + 1];
  const unit = lesson.units;
  const slug = unit.levels?.paths?.slug ?? "";
  const unitHref = `/student/${slug}/unit/${unit.id}`;
  const quizId = (unit.quizzes ?? []).find((q) => q.kind === "unit")?.id;
  const nextHref = next ? `/student/learn/${next.id}` : quizId ? `/student/quiz/${quizId}` : unitHref;
  const nextLabel = next ? "التالي" : quizId ? "إلى الاختبار" : "إلى الوحدة";
  const completed = progress?.status === "completed";
  const features = parseFeatures(unit.levels?.paths?.features);

  // Locked: earlier lessons (or the previous unit) are not finished yet.
  if (blocker === "locked" && !completed) {
    return (
      <>
        <TopBar backHref={unitHref} subtitle={<>الوحدة {unit.position}</>} title={<MixedText text={lesson.title} />} />
        <main className="mx-auto flex w-full max-w-[680px] flex-col items-center gap-4 px-4 py-12 text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-muted text-subtle">
            <Lock className="size-8" aria-hidden="true" />
          </span>
          <h1 className="text-xl font-bold">هذا الدرس مقفل</h1>
          <p className="text-muted-foreground">الدروس تُفتح بالترتيب. أكمل الدرس الذي قبله أولاً.</p>
          <Button asChild>
            <Link href={unitHref}>إلى الوحدة</Link>
          </Button>
        </main>
      </>
    );
  }

  const videos: Record<string, VideoStatus> = {};
  for (const v of views ?? []) videos[v.youtube_id] = { watched: v.watched_sec, duration: v.duration_sec, done: Boolean(v.completed_at) };
  const tasksRequired = !ai.paused;
  const speakingTask = features.speaking ? (lesson.speaking_task as PackageLesson["speaking_task"] | null) : null;
  const writingTask = features.writing ? (lesson.writing_task as PackageLesson["writing_task"] | null) : null;
  const tasks: GateTask[] = [];
  if (speakingTask && tasksRequired) {
    tasks.push({ label: "سجّل مهمة المحادثة", done: (speakingDone ?? []).length > 0, href: `/student/practice/speaking/${lesson.id}` });
  }
  if (writingTask && tasksRequired) {
    tasks.push({ label: "أرسل مهمة الكتابة", done: (writingDone ?? []).length > 0, href: `/student/practice/writing/${lesson.id}` });
  }

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
        <LessonBlocks blocks={blocks} videos={videos} />
        <TaskPreview
          lessonId={lesson.id}
          speaking={speakingTask}
          writing={writingTask}
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
        <div className="mx-auto max-w-[680px]">
          <LessonGate
            lessonId={lesson.id}
            nextHref={nextHref}
            nextLabel={nextLabel}
            completed={completed}
            exerciseIds={exerciseIds}
            videoRequired={trackedVideos.length > 0}
            videoDone={trackedVideos.every((id) => videos[id]?.done)}
            tasks={tasks}
          />
          <p className="mt-1.5 text-center text-xs text-muted-foreground">
            الوحدة: <En>{unit.title}</En>
          </p>
        </div>
      </footer>
    </>
  );
}
