import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { AssistantChat } from "@/components/practice/assistant-chat";
import { PracticeHeader } from "@/components/practice/practice-header";
import { remainingToday } from "@/lib/ai/limits";
import { aiConfigured } from "@/lib/ai/provider";
import { requireActiveStudent } from "@/lib/auth/session";
import { getTaskLesson } from "@/lib/practice/server";

export const metadata: Metadata = { title: "المساعد" };

export default async function AssistantPage(props: PageProps<"/student/learn/[lessonId]/assistant">) {
  const { lessonId } = await props.params;
  const { userId } = await requireActiveStudent();
  const lesson = await getTaskLesson(lessonId);
  if (!lesson) notFound();
  const today = await remainingToday(userId);

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <PracticeHeader backHref={`/student/learn/${lesson.id}`} overline={`عن درس: ${lesson.title}`} title="المساعد" />
      {aiConfigured() ? (
        <AssistantChat lessonId={lesson.id} initialRemaining={today.remaining.assistant} />
      ) : (
        <main className="mx-auto w-full max-w-[640px] p-4">
          <Card className="p-4 text-sm text-muted-foreground">المساعد غير مفعّل بعد. سيُفتح قريباً.</Card>
        </main>
      )}
    </div>
  );
}
