"use client";

import { useState, useSyncExternalStore } from "react";
import { CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Rafed } from "@/components/art/rafed";
import { WaterBar } from "@/components/lesson/water-bar";
import { MixedText } from "@/components/mixed-text";
import { checkAnswer, shuffleWords } from "@/lib/content/check-answer";
import { confetti } from "@/lib/confetti";
import { fx } from "@/lib/fx";
import { markSolved, solvedStore } from "@/lib/gamification/events";
import { addMistake, removeMistake } from "@/lib/mistakes";
import type { PackageQuestion } from "@/lib/content/types";
import { cn } from "@/lib/utils";
import { QuestionInput, isAnswered, type Answer } from "./question-input";

const PRAISE = ["أحسنت!", "ممتاز!", "كذا الشغل!", "رائع!"];

/**
 * Exercises one at a time, checked on the device (works offline): a progress bar, instant feedback
 * with the Arabic explanation, a streak counter and a celebration at the end. Every exercise must be
 * answered right (lessons require them all). Wrong answers are kept for «تدرّب على أخطائك».
 * In `review` mode it replays saved mistakes; a right answer removes the mistake.
 */
export function ExerciseStepper({ exercises, mode = "lesson" }: { exercises: PackageQuestion[]; mode?: "lesson" | "review" }) {
  const stored = solvedStore.parse(useSyncExternalStore(solvedStore.subscribe, solvedStore.getSnapshot, solvedStore.getServerSnapshot));
  const [session, setSession] = useState<Set<string>>(new Set());
  const solved = mode === "lesson" ? new Set([...stored, ...session]) : session;
  const firstOpen = exercises.findIndex((e) => !solved.has(e.id));
  const [pick, setPick] = useState<number | null>(null);
  const index = pick ?? (firstOpen < 0 ? exercises.length : firstOpen);
  const [value, setValue] = useState<Answer>(undefined);
  const [result, setResult] = useState<"right" | "wrong" | null>(null);
  const [streak, setStreak] = useState(0);
  const [tries, setTries] = useState(0);

  if (exercises.length === 0) return null;
  const finished = index >= exercises.length;
  const exercise = exercises[Math.min(index, exercises.length - 1)];
  const words = exercise.kind === "order_words" && Array.isArray(exercise.answer) ? shuffleWords(exercise.answer, exercise.id) : null;
  const title = mode === "review" ? "تدرّب على أخطائك" : "تمارين الدرس";

  const check = () => {
    const right = checkAnswer(exercise, value);
    setPick(index); // stay on this exercise to show the feedback
    setResult(right ? "right" : "wrong");
    fx(right ? "ok" : "bad");
    setTries((t) => t + 1);
    if (right) {
      setStreak((s) => s + 1);
      setSession((s) => new Set(s).add(exercise.id));
      markSolved(exercise.id);
      if (mode === "review" || tries === 0) removeMistake(exercise.id);
    } else {
      setStreak(0);
      addMistake(exercise);
    }
  };

  const next = () => {
    const after = exercises.findIndex((e, i) => i > index && !solved.has(e.id));
    const target = after >= 0 ? after : exercises.length;
    setPick(target);
    setValue(undefined);
    setResult(null);
    setTries(0);
    if (target >= exercises.length) {
      fx("coin");
      confetti();
    }
  };

  return (
    <section aria-label={title} className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <h2 className="flex-1 text-base font-bold">{title}</h2>
        {streak >= 2 && !finished && (
          <span
            key={streak}
            className="flex items-center gap-1 font-en text-sm font-extrabold text-[#1C6FA3] motion-safe:animate-[pop-in_.35s]"
            aria-live="polite"
          >
            <svg viewBox="0 0 20 26" className="h-5 w-4" aria-hidden="true">
              <path d="M10 1C10 1 2 12 2 17a8 8 0 0 0 16 0C18 12 10 1 10 1Z" fill="#2E9BD6" />
            </svg>
            ×{streak}
          </span>
        )}
        <span className="text-xs text-muted-foreground">
          {finished ? `${exercises.length} من ${exercises.length}` : `التمرين ${index + 1} من ${exercises.length}`}
        </span>
      </div>
      <WaterBar value={exercises.filter((e) => solved.has(e.id)).length} max={exercises.length} />

      {finished ? (
        <div className="flex flex-col items-center gap-2 py-3 text-center motion-safe:animate-[rise-in_.4s]">
          <Rafed mood="happy" move="cheer" moveKey="done" size={84} />
          <p className="text-lg font-bold">{mode === "review" ? "راجعت كل أخطائك 🎉" : "أنهيت كل التمارين 🎉"}</p>
          <p className="text-sm text-muted-foreground">{mode === "review" ? "الأخطاء التي صحّحتها خرجت من القائمة." : "اضغط «التالي» لتكمل الدرس."}</p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              setPick(0);
              setValue(undefined);
              setResult(null);
              setStreak(0);
            }}
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            أعد التمارين
          </Button>
        </div>
      ) : (
        <>
          <p key={`q-${exercise.id}`} className="text-[17px] leading-relaxed font-semibold motion-safe:animate-[slide-in-ltr_.38s_cubic-bezier(.2,.8,.2,1)]">
            <MixedText text={exercise.prompt} />
          </p>
          <QuestionInput
            key={exercise.id}
            question={{ id: exercise.id, kind: exercise.kind, prompt: exercise.prompt, options: exercise.options, words }}
            value={value}
            onChange={(v) => {
              setValue(v);
              if (result === "wrong") setResult(null);
            }}
            disabled={result === "right"}
          />
          {result ? (
            <div
              role="status"
              className={cn(
                "sticky bottom-0 z-20 -mx-4 -mb-4 flex flex-col gap-3 rounded-b-3xl px-4 pt-3 pb-4 motion-safe:animate-[sheet-up_.4s_cubic-bezier(.34,1.4,.64,1)]",
                result === "right" ? "bg-success-tint" : "bg-destructive-tint",
              )}
            >
              <div className="flex items-start gap-2">
                <Rafed
                  mood={result === "right" ? "happy" : "sad"}
                  move={result === "right" ? "hop" : "oops"}
                  moveKey={`${index}-${result}`}
                  idle={false}
                  size={46}
                />
                <div className="min-w-0 flex-1 text-sm">
                  <p className={cn("flex items-center gap-1.5 text-base font-bold", result === "right" ? "text-success" : "text-destructive")}>
                    {result === "right" ? <CheckCircle2 className="size-5" aria-hidden="true" /> : <XCircle className="size-5" aria-hidden="true" />}
                    {result === "right" ? `أحسنت · ${PRAISE[index % PRAISE.length]}` : "ليست الإجابة الصحيحة"}
                  </p>
                  <p className="mt-1 leading-relaxed">
                    {result === "right" ? <MixedText text={exercise.explanation_ar} /> : "فكّر مرة أخرى وجرّب. أُضيف السؤال إلى «دفتر أخطائي» لتراجعه لاحقاً."}
                  </p>
                </div>
              </div>
              {result === "right" ? (
                <Button
                  type="button"
                  className="min-h-12 bg-success shadow-[0_4px_0_#05502E] hover:bg-success active:translate-y-1 active:shadow-none"
                  onClick={next}
                >
                  {exercises.some((e, i) => i > index && !solved.has(e.id)) ? "متابعة" : "إنهاء التمارين"}
                </Button>
              ) : (
                <Button
                  type="button"
                  className="min-h-12 bg-destructive shadow-[0_4px_0_#7A1A10] hover:bg-destructive active:translate-y-1 active:shadow-none"
                  disabled={!isAnswered(value)}
                  onClick={check}
                >
                  تحقق مرة أخرى
                </Button>
              )}
            </div>
          ) : (
            <Button
              type="button"
              className="min-h-12 shadow-[0_4px_0_var(--color-primary-hover)] active:translate-y-1 active:shadow-none"
              disabled={!isAnswered(value)}
              onClick={check}
            >
              تحقّق
            </Button>
          )}
        </>
      )}
    </section>
  );
}
