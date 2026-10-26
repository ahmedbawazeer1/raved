"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Volume2, X } from "lucide-react";
import { Alert } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { En } from "@/components/en";
import { MixedText } from "@/components/mixed-text";
import { ProgressBar } from "@/components/student/progress-bar";
import { QuestionInput, type Answer } from "@/components/lesson/question-input";
import { answerPlacement } from "@/app/(auth)/placement/actions";
import { EXPECTED_MINUTES, MAX_QUESTIONS, SKILL_LABELS_AR } from "@/lib/placement/engine";
import type { PlacementQuestionView } from "@/lib/placement/server";
import { speak, useEnglishVoice, useSpeechSupported } from "@/lib/tts";

const MAX_PLAYS = 2;

function remaining(startedAt: string, now: number): string {
  const left = Math.max(0, EXPECTED_MINUTES * 60 - Math.floor((now - new Date(startedAt).getTime()) / 1000));
  return `${String(Math.floor(left / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}`;
}

/** One question at a time; every answer is saved on the server, so the test resumes after a disconnect. */
export function PlacementRunner({
  attemptId,
  initialQuestion,
  initialAnswered,
  startedAt,
}: {
  attemptId: string;
  initialQuestion: PlacementQuestionView;
  initialAnswered: number;
  startedAt: string;
}) {
  const router = useRouter();
  const [question, setQuestion] = useState(initialQuestion);
  const [answered, setAnswered] = useState(initialAnswered);
  const [value, setValue] = useState<Answer>(undefined);
  const [plays, setPlays] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [sending, startTransition] = useTransition();
  const speechSupported = useSpeechSupported();
  const hasVoice = useEnglishVoice();

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(t);
      window.speechSynthesis?.cancel();
    };
  }, []);

  function submit(answer: number | null) {
    setError(null);
    startTransition(async () => {
      let res;
      try {
        res = await answerPlacement({ attemptId, questionId: question.id, answer });
      } catch {
        setError("لا يوجد اتصال. إجابتك لم تُرسل بعد، اضغط «التالي» مرة أخرى عند عودة الاتصال.");
        return;
      }
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (res.done) {
        router.push("/placement/result");
        return;
      }
      window.speechSynthesis?.cancel();
      setQuestion(res.question);
      setAnswered(res.answered);
      setValue(undefined);
      setPlays(0);
      setSpeaking(false);
    });
  }

  function listen() {
    if (!question.listen || plays >= MAX_PLAYS) return;
    setPlays(plays + 1);
    setSpeaking(true);
    speak(question.listen, { rate: 0.85, onEnd: () => setSpeaking(false) });
  }

  const noVoice = speechSupported === false || !hasVoice;
  const left = remaining(startedAt, now);
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex flex-col gap-2 border-b border-border bg-card px-4 py-2.5">
        <div className="mx-auto flex w-full max-w-[640px] items-center justify-between">
          <Link href="/student" aria-label="أكمل لاحقاً" className="flex size-11 items-center justify-center rounded-full text-foreground">
            <X className="size-[22px]" aria-hidden="true" />
          </Link>
          <p className="font-bold">اختبار المستوى</p>
          <span className="min-w-11 text-center text-sm font-semibold" aria-label="الوقت المتبقي التقريبي">
            <En>{left}</En>
          </span>
        </div>
        <div className="mx-auto w-full max-w-[640px]">
          <ProgressBar value={answered} max={MAX_QUESTIONS} label="تقدم الاختبار" />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[640px] flex-1 flex-col gap-3.5 px-4 py-[18px]">
        <p className="text-sm font-semibold text-muted-foreground">
          {SKILL_LABELS_AR[question.skill]} · السؤال {answered + 1}
        </p>

        {question.listen && (
          <Card className="flex items-center gap-3.5 p-4">
            <Button
              className="size-14 flex-none rounded-full p-0"
              onClick={listen}
              disabled={noVoice || plays >= MAX_PLAYS || speaking}
              aria-label="استمع"
            >
              <Volume2 className="size-6" aria-hidden="true" />
            </Button>
            <div className="flex-1">
              <p className="font-semibold">استمع للجملة</p>
              <p className="text-[13px] text-muted-foreground">تستطيع الاستماع مرتين · بصوت جهازك، بلا تحميل</p>
            </div>
            <Badge tone="muted">
              {Math.min(plays, MAX_PLAYS)} من {MAX_PLAYS}
            </Badge>
          </Card>
        )}
        {question.listen && noVoice && (
          <p className="rounded-lg bg-warning-tint p-3 text-[13px] leading-relaxed text-[#5C3D00]">
            جهازك لا يحتوي صوتاً إنجليزياً، فاقرأ الجملة بدلاً من سماعها:{" "}
            <En className="font-semibold">{question.listen}</En>
          </p>
        )}

        <h2 className="text-[19px] leading-relaxed font-bold">
          <MixedText text={question.prompt} />
        </h2>
        {question.text && (
          <Card className="p-4">
            <En as="p" className="text-[17px] leading-relaxed">
              {question.text}
            </En>
          </Card>
        )}

        <QuestionInput
          question={{ id: question.id, kind: "mcq", prompt: question.prompt, options: question.options }}
          value={value}
          onChange={setValue}
          disabled={sending}
        />
        {error && <Alert tone="error">{error}</Alert>}
      </main>

      <footer className="sticky bottom-0 border-t border-border bg-card px-4 pt-3 pb-5">
        <div className="mx-auto flex w-full max-w-[640px] gap-2">
          <Button variant="secondary" className="flex-1" disabled={sending} onClick={() => submit(null)}>
            لا أعرف
          </Button>
          <Button className="flex-[2]" disabled={sending || typeof value !== "number"} onClick={() => submit(value as number)}>
            {sending ? "جارٍ الحفظ…" : "التالي"}
          </Button>
        </div>
      </footer>
    </div>
  );
}
