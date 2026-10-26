"use client";

import { useActionState, useState } from "react";
import { Flag, ThumbsDown, ThumbsUp } from "lucide-react";
import { Alert, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { rateLesson, reportLesson, type FeedbackState } from "@/app/(student)/student/actions";
import { cn } from "@/lib/utils";

/** «مفيد / غير مفيد» and «أبلغ عن خطأ» (LRN-06). */
export function LessonFeedback({ lessonId, initialRating }: { lessonId: string; initialRating: string | null }) {
  const [rating, setRating] = useState(initialRating);
  const [rateState, rateAction] = useActionState<FeedbackState, FormData>(rateLesson, {});
  const [reportState, reportAction] = useActionState<FeedbackState, FormData>(reportLesson, {});
  const [reporting, setReporting] = useState(false);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <form action={rateAction} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="lesson_id" value={lessonId} />
        <p className="flex-1 text-sm font-semibold">هل كان الدرس مفيداً؟</p>
        {(["useful", "not_useful"] as const).map((r) => (
          <button
            key={r}
            type="submit"
            name="rating"
            value={r}
            onClick={() => setRating(r)}
            aria-pressed={rating === r}
            className={cn(
              "inline-flex min-h-11 items-center gap-1.5 rounded-xl border px-3 text-sm font-semibold",
              rating === r ? "border-primary bg-primary-tint text-primary-hover" : "border-input bg-card text-subtle",
            )}
          >
            {r === "useful" ? <ThumbsUp className="size-4" aria-hidden="true" /> : <ThumbsDown className="size-4" aria-hidden="true" />}
            {r === "useful" ? "مفيد" : "غير مفيد"}
          </button>
        ))}
      </form>
      {rateState.error && <Alert tone="error">{rateState.error}</Alert>}
      {rateState.ok && <p className="text-xs text-muted-foreground">شكراً، وصل تقييمك.</p>}

      {reportState.ok ? (
        <Alert tone="success">شكراً! وصل البلاغ وسنراجعه.</Alert>
      ) : reporting ? (
        <form action={reportAction} className="flex flex-col gap-2">
          <input type="hidden" name="lesson_id" value={lessonId} />
          <label htmlFor="report-note" className="text-sm font-semibold">
            ما الخطأ الذي وجدته؟
          </label>
          <Textarea id="report-note" name="note" rows={2} maxLength={1000} required />
          {reportState.error && <Alert tone="error">{reportState.error}</Alert>}
          <SubmitButton variant="secondary" className="self-start" pendingLabel="جارٍ الإرسال…">
            أرسل البلاغ
          </SubmitButton>
        </form>
      ) : (
        <button type="button" onClick={() => setReporting(true)} className="inline-flex min-h-9 items-center gap-1.5 self-start text-sm text-muted-foreground">
          <Flag className="size-4" aria-hidden="true" /> أبلغ عن خطأ
        </button>
      )}
    </div>
  );
}
