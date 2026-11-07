"use client";

import { useActionState } from "react";
import { MessageSquareHeart } from "lucide-react";
import { Alert, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { sendFeedback, type FeedbackState } from "@/app/(student)/student/actions";

/** «ملاحظاتك تهمّنا»: a short note for the Raved team, shown to the admin in /admin/reports. */
export function FeedbackForm() {
  const [state, action] = useActionState<FeedbackState, FormData>(sendFeedback, {});
  if (state.ok) return <Alert tone="success">شكراً! وصلت ملاحظتك لفريق رفد، وسنقرأها بعناية.</Alert>;
  return (
    <form action={action} className="flex flex-col gap-2">
      <label htmlFor="feedback-note" className="flex items-center gap-2 text-sm font-semibold">
        <MessageSquareHeart className="size-5 text-primary" aria-hidden="true" />
        ملاحظاتك تهمّنا
      </label>
      <p className="text-sm text-muted-foreground">مشكلة واجهتك، أو فكرة تجعل رفد أفضل؟ اكتبها هنا. لا تكتب رقم هاتفك أو كلمة مرورك.</p>
      <Textarea id="feedback-note" name="note" rows={3} maxLength={1000} required />
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <SubmitButton variant="secondary" className="self-start" pendingLabel="جارٍ الإرسال…">
        أرسل الملاحظة
      </SubmitButton>
    </form>
  );
}
