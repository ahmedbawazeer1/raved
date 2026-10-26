"use client";

import { useActionState } from "react";
import { Alert, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { reviewAiAttempt, type AdminFormState } from "@/app/(admin)/admin/actions";

export function AiReviewForm({ attemptType, attemptId }: { attemptType: "speaking" | "writing"; attemptId: string }) {
  const [state, action] = useActionState<AdminFormState, FormData>(reviewAiAttempt, {});
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="attempt_type" value={attemptType} />
      <input type="hidden" name="attempt_id" value={attemptId} />
      <label htmlFor={`note-${attemptId}`} className="sr-only">
        ملاحظة
      </label>
      <Input id={`note-${attemptId}`} name="note" placeholder="ملاحظة (اختياري)" maxLength={1000} />
      <div className="flex flex-wrap gap-2">
        <SubmitButton name="agrees" value="yes" pendingLabel="…">
          أوافق على التقييم
        </SubmitButton>
        <SubmitButton name="agrees" value="no" variant="secondary" pendingLabel="…">
          لا أوافق
        </SubmitButton>
      </div>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.message && <Alert tone="success">{state.message}</Alert>}
    </form>
  );
}
