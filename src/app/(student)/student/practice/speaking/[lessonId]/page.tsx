import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { En } from "@/components/en";
import { PracticeHeader } from "@/components/practice/practice-header";
import { SpeakingRecorder } from "@/components/practice/speaking-recorder";
import { remainingToday } from "@/lib/ai/limits";
import { aiConfigured } from "@/lib/ai/provider";
import { requireActiveStudent } from "@/lib/auth/session";
import { parseFeatures } from "@/lib/paths/features";
import { getTaskLesson } from "@/lib/practice/server";

export const metadata: Metadata = { title: "مهمة المحادثة" };

export default async function SpeakingTaskPage(props: PageProps<"/student/practice/speaking/[lessonId]">) {
  const { lessonId } = await props.params;
  const { userId } = await requireActiveStudent();
  const lesson = await getTaskLesson(lessonId);
  if (!lesson?.speaking || !parseFeatures(lesson.features).speaking) notFound();
  const today = await remainingToday(userId);
  const task = lesson.speaking;

  return (
    <div className="flex flex-col">
      <PracticeHeader
        backHref="/student/practice"
        overline={`محادثة · ${today.used.speaking} من ${today.limits.speaking} اليوم`}
        title={lesson.title}
      />
      <main className="mx-auto flex w-full max-w-[640px] flex-col gap-3 p-4">
        <Card className="flex flex-col gap-2 p-4">
          <En as="p" className="text-[17px] leading-relaxed font-semibold">
            {task.prompt_en}
          </En>
          {task.helpful_phrases?.length ? (
            <div className="flex flex-wrap gap-1.5" dir="ltr">
              {task.helpful_phrases.map((p) => (
                <span key={p} className="rounded-full bg-ai-tint px-3 py-1 font-en text-sm text-ai">
                  {p}
                </span>
              ))}
            </div>
          ) : null}
          <p className="text-[13px] text-muted-foreground">تكلّم حتى {task.max_seconds} ثانية · يحتاج اتصالاً · لا نحفظ صوتك</p>
        </Card>
        {aiConfigured() ? (
          <SpeakingRecorder lessonId={lesson.id} prepSeconds={task.prep_seconds} maxSeconds={task.max_seconds} remaining={today.remaining.speaking} />
        ) : (
          <Card className="p-4 text-sm leading-relaxed text-muted-foreground">
            التقييم الآلي غير مفعّل بعد. تدرّب الآن بصوت عالٍ، وسيُفتح التقييم قريباً.
          </Card>
        )}
      </main>
    </div>
  );
}
