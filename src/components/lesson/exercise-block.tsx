"use client";

import { useState, useSyncExternalStore } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MixedText } from "@/components/mixed-text";
import { checkAnswer, shuffleWords } from "@/lib/content/check-answer";
import { markSolved, solvedStore } from "@/lib/gamification/events";
import type { PackageQuestion } from "@/lib/content/types";
import { QuestionInput, isAnswered, type Answer } from "./question-input";

/** In-lesson exercise: checked on the device (works offline), with the Arabic explanation. */
export function ExerciseBlock({ exercise }: { exercise: PackageQuestion }) {
  const [value, setValue] = useState<Answer>(undefined);
  const [checked, setResult] = useState<"right" | "wrong" | null>(null);
  // Solved before on this device: show it as solved (lessons require every exercise).
  const solvedBefore = solvedStore.parse(useSyncExternalStore(solvedStore.subscribe, solvedStore.getSnapshot, solvedStore.getServerSnapshot)).has(exercise.id);
  const result = checked ?? (solvedBefore ? "right" : null);
  const words = exercise.kind === "order_words" && Array.isArray(exercise.answer) ? shuffleWords(exercise.answer, exercise.id) : null;

  return (
    <Card className="flex flex-col gap-3 p-4">
      <p className="text-xs font-semibold text-muted-foreground">تمرين</p>
      <p className="text-[17px] font-semibold leading-relaxed">
        <MixedText text={exercise.prompt} />
      </p>
      <QuestionInput
        question={{ id: exercise.id, kind: exercise.kind, prompt: exercise.prompt, options: exercise.options, words }}
        value={value}
        onChange={(v) => {
          setValue(v);
          if (result === "wrong") setResult(null);
        }}
        disabled={result === "right"}
      />
      {result && (
        <div
          role="status"
          className={result === "right" ? "rounded-xl bg-success-tint p-3 text-sm" : "rounded-xl bg-destructive-tint p-3 text-sm"}
        >
          <p className={`flex items-center gap-1.5 font-semibold ${result === "right" ? "text-success" : "text-destructive"}`}>
            {result === "right" ? <CheckCircle2 className="size-4" aria-hidden="true" /> : <XCircle className="size-4" aria-hidden="true" />}
            {result === "right" ? "إجابة صحيحة" : "ليست الإجابة الصحيحة"}
          </p>
          <p className="mt-1 leading-relaxed">
            {result === "right" ? <MixedText text={exercise.explanation_ar} /> : "فكّر مرة أخرى وجرّب."}
          </p>
        </div>
      )}
      {result !== "right" && (
        <Button type="button" disabled={!isAnswered(value)} onClick={() => {
            const right = checkAnswer(exercise, value);
            setResult(right ? "right" : "wrong");
            if (right) markSolved(exercise.id);
          }}>
          تحقق من الإجابة
        </Button>
      )}
    </Card>
  );
}
