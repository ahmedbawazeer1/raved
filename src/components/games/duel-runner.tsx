"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Timer } from "lucide-react";
import { Alert } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { En } from "@/components/en";
import { submitDuel } from "@/app/(student)/student/duel/actions";
import { cn } from "@/lib/utils";

/** Milliseconds since `start` (kept outside the component: reading the clock is not a render concern). */
function since(start: number): number {
  return Date.now() - start;
}

/** 10 quick rounds against a friend: answers are graded on the server; time breaks ties. */
export function DuelRunner({ code, questions }: { code: string; questions: { word: string; options: string[] }[] }) {
  const router = useRouter();
  const [started, setStarted] = useState(false);
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const startedAt = useRef(0);

  useEffect(() => {
    if (!started) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [started]);

  if (!started) {
    return (
      <Button
        type="button"
        className="min-h-14 text-lg"
        onClick={() => {
          startedAt.current = since(0);
          setStarted(true);
        }}
      >
        ابدأ التحدي ({questions.length} أسئلة)
      </Button>
    );
  }

  const q = questions[i];
  const choose = (k: number) => {
    const next = { ...answers, [String(i)]: k };
    setAnswers(next);
    if (i + 1 < questions.length) {
      setI(i + 1);
      return;
    }
    const elapsed = since(startedAt.current);
    startTransition(async () => {
      const res = await submitDuel(code, next, elapsed);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-sm">
        <span>
          السؤال {i + 1} من {questions.length}
        </span>
        <span className="flex items-center gap-1 font-en">
          <Timer className="size-4" aria-hidden="true" />
          {seconds}s
        </span>
      </div>
      <p className="rounded-2xl bg-primary py-6 text-center text-3xl font-bold text-white">
        <En>{q.word}</En>
      </p>
      <div className="grid gap-2">
        {q.options.map((o, k) => (
          <button
            key={o}
            type="button"
            disabled={pending}
            onClick={() => choose(k)}
            className={cn("min-h-12 rounded-xl border-2 border-border bg-card font-semibold", pending && "opacity-60")}
          >
            {o}
          </button>
        ))}
      </div>
      {pending && <p className="text-center text-sm text-muted-foreground">جارٍ التصحيح…</p>}
      {error && <Alert tone="error">{error}</Alert>}
    </div>
  );
}
