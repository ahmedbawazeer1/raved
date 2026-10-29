import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LessonBlocks } from "@/components/lesson/lesson-blocks";
import { TaskPreview } from "@/components/lesson/task-preview";
import { MixedText } from "@/components/mixed-text";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { LessonBlock, PackageLesson } from "@/lib/content/types";

export const metadata: Metadata = { title: "معاينة درس", robots: { index: false } };

/** Admin-only: a lesson exactly as a student sees it (shown inside a 390px frame on the review page). */
export default async function LessonPreviewPage({ params }: PageProps<"/preview/lesson/[lessonId]">) {
  const { lessonId } = await params;
  await requireAdmin();
  const supabase = await createClient();
  const { data: lesson } = await supabase
    .from("lessons")
    .select("id, unit_id, title, blocks, speaking_task, writing_task")
    .eq("id", lessonId)
    .maybeSingle();
  if (!lesson) notFound();
  // Games play the unit's words.
  const { data: vocab } = await supabase
    .from("vocab_items")
    .select("item_key, word, meaning_ar, example_en")
    .eq("unit_id", lesson.unit_id)
    .eq("archived", false)
    .order("position");
  const words = (vocab ?? []).map((v) => ({ id: v.item_key, word: v.word, meaning: v.meaning_ar, example: v.example_en }));

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border bg-card px-4 py-3">
        <p className="text-base font-bold">
          <MixedText text={lesson.title} />
        </p>
      </header>
      <main className="flex flex-col gap-4 px-4 py-5">
        <LessonBlocks blocks={(lesson.blocks ?? []) as unknown as LessonBlock[]} words={words} />
        <TaskPreview
          lessonId={lesson.id}
          speaking={lesson.speaking_task as PackageLesson["speaking_task"] | null}
          writing={lesson.writing_task as PackageLesson["writing_task"] | null}
        />
      </main>
    </div>
  );
}
