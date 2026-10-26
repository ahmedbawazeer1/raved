import type { Metadata } from "next";
import { notFound } from "next/navigation";
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
  const [{ data: quiz, error }, { data: meta }] = await Promise.all([
    supabase.rpc("get_quiz", { p_quiz_id: quizId }),
    supabase.from("quizzes").select("units(id, levels(paths(slug)))").eq("id", quizId).maybeSingle(),
  ]);
  if (error || !quiz) notFound();
  const questions = (quiz as unknown as { questions: QuestionView[] }).questions;
  if (questions.length === 0) notFound();
  const unit = meta?.units;
  const closeHref = unit ? `/student/${unit.levels?.paths?.slug}/unit/${unit.id}` : "/student";

  return (
    <div className="fixed inset-0 z-30 overflow-y-auto bg-background">
      <QuizRunner quizId={quizId} questions={questions} closeHref={closeHref} />
    </div>
  );
}
