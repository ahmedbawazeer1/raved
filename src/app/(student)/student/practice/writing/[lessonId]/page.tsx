import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { En } from "@/components/en";
import { PracticeHeader } from "@/components/practice/practice-header";
import { WritingEditor } from "@/components/practice/writing-editor";
import { remainingToday } from "@/lib/ai/limits";
import { requireActiveStudent } from "@/lib/auth/session";
import { parseFeatures } from "@/lib/paths/features";
import { getTaskLesson } from "@/lib/practice/server";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "مهمة الكتابة" };

export default async function WritingTaskPage(props: PageProps<"/student/practice/writing/[lessonId]">) {
  const { lessonId } = await props.params;
  const sp = await props.searchParams;
  const { userId } = await requireActiveStudent();
  const lesson = await getTaskLesson(lessonId);
  if (!lesson?.writing || !parseFeatures(lesson.features).writing) notFound();

  // Rewriting: start from the previous version (WRT-03).
  const from = typeof sp.from === "string" ? sp.from : null;
  let parent: { id: string; text: string } | null = null;
  if (from) {
    const supabase = await createClient();
    const { data } = await supabase.from("writing_submissions").select("id, text").eq("id", from).eq("student_id", userId).eq("lesson_id", lessonId).maybeSingle();
    parent = data;
  }
  const today = await remainingToday(userId);
  const task = lesson.writing;

  return (
    <div className="flex flex-col">
      <PracticeHeader backHref="/student/practice" overline={`كتابة · ${today.used.writing} من ${today.limits.writing} اليوم`} title={lesson.title} />
      <main className="mx-auto flex w-full max-w-[640px] flex-col gap-3 p-4">
        <Card className="flex flex-col gap-1.5 p-4">
          <En as="p" className="text-[17px] leading-relaxed font-semibold">
            {task.prompt_en}
          </En>
          <p className="text-[13px] text-muted-foreground">
            من {task.min_words} إلى {task.max_words} كلمة · تستطيع الكتابة بلا إنترنت
          </p>
        </Card>
        {parent && <p className="text-sm text-muted-foreground">عدّل نسختك السابقة حسب التصحيحات، ثم أرسلها لترى الفرق.</p>}
        <WritingEditor lessonId={lesson.id} minWords={task.min_words} maxWords={task.max_words} initialText={parent?.text ?? ""} parentId={parent?.id ?? null} />
      </main>
    </div>
  );
}
