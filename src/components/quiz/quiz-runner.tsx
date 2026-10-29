"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Clock, X } from "lucide-react";
import { Alert } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { MixedText } from "@/components/mixed-text";
import { QuestionInput, isAnswered, type Answer, type QuestionView } from "@/components/lesson/question-input";
import { submitQuiz } from "@/app/(student)/student/actions";
import { cn } from "@/lib/utils";

function newClientId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (Number(c) ^ ((Math.random() * 16) >> (Number(c) / 4))).toString(16));
}

/**
 * One question per screen; answers are graded on the server only after the last question.
 * Shown as a battle with the guardian of the journey stop: each answer charges the attack,
 * and the result page shows the hits once the server has graded.
 */
export function QuizRunner({ quizId, questions, closeHref, stop }: { quizId: string; questions: QuestionView[]; closeHref: string; stop?: string | null }) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [clientId] = useState(newClientId);

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const q = questions[index];
  const last = index === questions.length - 1;
  const value = answers[q.id];

  function next() {
    if (!last) {
      setIndex(index + 1);
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await submitQuiz(quizId, answers, clientId);
      if (res?.error) setError(res.error);
    });
  }

  const time = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card px-3 pt-2 pb-3">
        <div className="flex items-center gap-2">
          <Link href={closeHref} aria-label="إغلاق الاختبار" className="flex size-11 items-center justify-center text-foreground">
            <X className="size-6" aria-hidden="true" />
          </Link>
          <p className="flex-1 font-bold">
            السؤال {index + 1} من {questions.length}
          </p>
          <span className="flex items-center gap-1 font-en text-sm text-muted-foreground" aria-label="الوقت">
            <Clock className="size-4" aria-hidden="true" />
            {time}
          </span>
        </div>
        <div className="mt-2 flex gap-1" aria-hidden="true">
          {questions.map((qq, i) => (
            <span
              key={qq.id}
              className={cn("h-1.5 flex-1 rounded-full", i < index || isAnswered(answers[qq.id]) ? "bg-primary" : i === index ? "bg-primary/40" : "bg-border")}
            />
          ))}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[640px] flex-1 flex-col gap-5 px-4 py-6">
        <div className="flex items-center gap-3 rounded-2xl bg-foreground p-3 text-white">
          <span className="text-3xl" aria-hidden="true">
            🛡️
          </span>
          <div className="flex flex-1 flex-col gap-1">
            <p className="text-sm font-bold">معركة المحطة: تغلّب على حارس {stop ?? "الوحدة"}</p>
            <div className="h-2 overflow-hidden rounded-full bg-white/20" aria-hidden="true">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${(Object.values(answers).filter((a) => isAnswered(a)).length / questions.length) * 100}%` }}
              />
            </div>
            <p className="text-xs text-white/70">كل إجابة تشحن ضربتك · النتيجة بعد التسليم</p>
          </div>
        </div>
        <h1 className="text-xl leading-relaxed font-bold">
          <MixedText text={q.prompt} />
        </h1>
        <QuestionInput question={q} value={value} onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))} disabled={pending} />
        {error && <Alert tone="error">{error}</Alert>}
      </main>

      <footer className="sticky bottom-[68px] border-t border-border bg-card px-4 pt-3 pb-5 md:bottom-0">
        <div className="mx-auto flex max-w-[640px] gap-2.5">
          {index > 0 && (
            <Button type="button" variant="secondary" className="min-h-13" disabled={pending} onClick={() => setIndex(index - 1)}>
              السابق
            </Button>
          )}
          <Button type="button" className="min-h-13 flex-1" disabled={pending || (!isAnswered(value) && !last)} onClick={next}>
            {pending ? "جارٍ التصحيح…" : last ? "سلّم الاختبار" : "التالي"}
          </Button>
        </div>
        {!isAnswered(value) && !last && <p className="mt-1.5 text-center text-xs text-muted-foreground">اختر إجابة للمتابعة</p>}
      </footer>
    </div>
  );
}
