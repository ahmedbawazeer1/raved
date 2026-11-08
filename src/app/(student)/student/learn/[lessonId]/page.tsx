import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Lock, MessageCircleQuestion } from "lucide-react";
import { En } from "@/components/en";
import { MixedText } from "@/components/mixed-text";
import { LessonBlocks } from "@/components/lesson/lesson-blocks";
import { LessonSteps, type LessonStep } from "@/components/lesson/lesson-steps";
import { SECTION_ICONS, lessonSections } from "@/lib/lesson/sections";
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
import { isVideoPart, progressByKey, videoKey, type VideoProgressRow } from "@shared/lesson/video-part";

export const metadata: Metadata = { title: "الدرس" };

export default async function LessonPage({ params }: PageProps<"/student/learn/[lessonId]">) {
  const { lessonId } = await params;
  const { userId } = await requireActiveStudent();
  const supabase = await createClient();

  const { data: lesson } = await supabase
    .from("lessons")
    .select(
      "id, unit_id, title, skill, position, blocks, speaking_task, writing_task, units(id, title, position, roleplay, quizzes(id, kind), levels(code, paths(slug, features)))",
    )
    .eq("id", lessonId)
    .maybeSingle();
  if (!lesson || !lesson.units) notFound();

  const blocks = (lesson.blocks ?? []) as unknown as LessonBlock[];
  const videoBlocks = blocks.flatMap((b) => (b.type === "video" && b.youtube_id && !b.needs_check ? [b] : []));
  // Keys: "id" for a whole video, "id@start" for a part (shared/lesson/video-part.ts).
  const trackedVideos = [...new Set(videoBlocks.map(videoKey))];
  const wholeIds = [...new Set(videoBlocks.filter((b) => !isVideoPart(b)).map((b) => b.youtube_id!))];
  const partIds = [...new Set(videoBlocks.filter(isVideoPart).map((b) => b.youtube_id!))];
  // Exercises, games and the story episode of the lesson: all mandatory.
  const exerciseIds = blocks.flatMap((b) =>
    b.type === "exercise" && b.exercise
      ? [b.exercise.id]
      : (b.type === "game" && b.id && b.game) || (b.type === "story" && b.id && b.panels?.length)
        ? [b.id]
        : [],
  );
  const hasGames = blocks.some((b) => b.type === "game");

  const [{ data: siblings }, { data: progress }, { data: blocker }, { data: views }, { data: speakingDone }, { data: writingDone }, ai, { data: vocab }] =
    await Promise.all([
      supabase.from("lessons").select("id, position").eq("unit_id", lesson.unit_id).order("position"),
      supabase.from("lesson_progress").select("status, rating").eq("student_id", userId).eq("lesson_id", lesson.id).maybeSingle(),
      supabase.rpc("my_lesson_blocker", { p_lesson_id: lesson.id }),
      Promise.all([
        wholeIds.length
          ? supabase.from("video_views").select("youtube_id, watched_sec, duration_sec, completed_at").eq("student_id", userId).in("youtube_id", wholeIds)
          : Promise.resolve({ data: [] as VideoProgressRow[] }),
        partIds.length
          ? supabase.from("video_part_views").select("youtube_id, start_sec, watched_sec, duration_sec, completed_at").eq("student_id", userId).in("youtube_id", partIds)
          : Promise.resolve({ data: [] as VideoProgressRow[] }),
      ]).then(([w, p]) => ({ data: progressByKey(w.data ?? [], p.data ?? []) })),
      supabase.from("speaking_attempts").select("id").eq("student_id", userId).eq("lesson_id", lesson.id).limit(1),
      supabase.from("writing_submissions").select("id").eq("student_id", userId).eq("lesson_id", lesson.id).limit(1),
      getAiSettings(),
      hasGames || trackedVideos.length
        ? supabase.from("vocab_items").select("item_key, word, meaning_ar, example_en").eq("unit_id", lesson.unit_id).eq("archived", false).order("position")
        : Promise.resolve({ data: [] as { item_key: string; word: string; meaning_ar: string; example_en: string }[] }),
    ]);
  const words = (vocab ?? []).map((v) => ({ id: v.item_key, word: v.word, meaning: v.meaning_ar, example: v.example_en }));
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
  Object.assign(videos, views ?? {});
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

  const roleplay = (unit.roleplay as { character_ar?: string } | null)?.character_ar;
  const steps: LessonStep[] = lessonSections(blocks).map((sec) => ({
    key: sec.key,
    title: sec.title,
    icon: SECTION_ICONS[sec.kind],
    requires: sec.requires,
    video: sec.kind === "video",
    content: <LessonBlocks blocks={sec.blocks} videos={videos} words={words} />,
  }));
  if (speakingTask || writingTask || (lesson.skill === "speaking" && features.speaking && roleplay)) {
    steps.push({
      key: "task",
      title: "المهمة",
      icon: SECTION_ICONS.task,
      requires: [],
      content: (
        <>
          <TaskPreview lessonId={lesson.id} speaking={speakingTask} writing={writingTask} />
          {lesson.skill === "speaking" && features.speaking && roleplay && (
            <Link
              href={`/student/practice/roleplay/${unit.id}`}
              className="flex min-h-12 items-center gap-3 rounded-2xl border border-ai-tint bg-ai-tint px-4 py-3 text-foreground no-underline hover:text-foreground"
            >
              <span className="text-2xl" aria-hidden="true">
                💬
              </span>
              <span className="flex-1">
                <span className="block font-semibold">تحدث مع {roleplay}</span>
                <span className="block text-[13px] text-muted-foreground">محادثة بالإنجليزية مع شخصية من الرحلة · +5 نقاط · يحتاج اتصالاً</span>
              </span>
            </Link>
          )}
        </>
      ),
    });
  }
  steps.push({
    key: "finish",
    title: "إنهاء الدرس",
    icon: SECTION_ICONS.finish,
    requires: [],
    content: (
      <>
        <div className="flex flex-col gap-2 rounded-3xl border border-border bg-card p-4 shadow-sm">
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
          <p className="text-center text-xs text-muted-foreground">
            الوحدة: <En>{unit.title}</En>
          </p>
        </div>
        <LessonFeedback lessonId={lesson.id} initialRating={progress?.rating ?? null} />
      </>
    ),
  });

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
        <LessonSteps
          lessonId={lesson.id}
          steps={steps}
          videoDone={trackedVideos.every((id) => videos[id]?.done)}
          completed={completed}
          help={
            <Link
              href={`/student/learn/${lesson.id}/assistant`}
              className="flex min-h-12 items-center gap-3 rounded-2xl border border-ai-tint bg-card px-4 py-2.5 text-foreground no-underline hover:text-foreground"
            >
              <MessageCircleQuestion className="size-6 flex-none text-ai" aria-hidden="true" />
              <span className="flex-1">
                <span className="block text-sm font-semibold">عندك سؤال؟ اسأل المساعد</span>
                <span className="block text-xs text-muted-foreground">يشرح هذا الدرس بالعربية · يحتاج اتصالاً</span>
              </span>
            </Link>
          }
        />
      </main>
    </>
  );
}
