import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuizRunner } from "@/components/quiz/quiz-runner";
import type { QuestionView } from "@/components/lesson/question-input";
import { requireActiveStudent } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "اختبار الوحدة" };

export default async function QuizPage({ params }: PageProps<"/student/quiz/[quizId]">) {
  const { quizId } = await params;
  await requireActiveStudent();
  const supabase = await createClient();

  // Questions come without answers (get_quiz runs on the server).
  const [{ data: quiz, error }, { data: meta }, { data: open }] = await Promise.all([
    supabase.rpc("get_quiz", { p_quiz_id: quizId }),
    supabase.from("quizzes").select("units(id, stop_ar, levels(paths(slug)))").eq("id", quizId).maybeSingle(),
    supabase.rpc("my_quiz_open", { p_quiz_id: quizId }),
  ]);
  if (error || !quiz) notFound();
  const questions = (quiz as unknown as { questions: QuestionView[] }).questions;
  if (questions.length === 0) notFound();
  const unit = meta?.units;
  const closeHref = unit ? `/student/${unit.levels?.paths?.slug}/unit/${unit.id}` : "/student";

  // The unit quiz opens after every lesson of the unit (the server refuses earlier answers too).
  if (!open) {
    return (
      <main className="mx-auto flex w-full max-w-[640px] flex-col items-center gap-4 px-4 py-16 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-muted text-subtle">
          <Lock className="size-8" aria-hidden="true" />
        </span>
        <h1 className="text-xl font-bold">الاختبار مقفل</h1>
        <p className="text-muted-foreground">أكمل كل دروس الوحدة أولاً، ثم يُفتح اختبار الوحدة.</p>
        <Button asChild>
          <Link href={closeHref}>إلى الوحدة</Link>
        </Button>
      </main>
    );
  }

  return (
    <div className="fixed inset-0 z-30 overflow-y-auto bg-background">
      <QuizRunner quizId={quizId} questions={questions} closeHref={closeHref} stop={unit?.stop_ar ?? null} />
    </div>
  );
}
