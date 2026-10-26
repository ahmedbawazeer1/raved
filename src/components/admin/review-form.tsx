"use client";

import { useActionState, useState } from "react";
import { Check } from "lucide-react";
import { Alert, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { reviewApplication, type AdminFormState } from "@/app/(admin)/admin/actions";

export function ReviewForm({ applicationId, nextId }: { applicationId: string; nextId?: string }) {
  const [state, action] = useActionState<AdminFormState, FormData>(reviewApplication, {});
  const [note, setNote] = useState("");

  return (
    <form action={action} className="flex flex-col gap-3 border-t border-muted pt-4">
      <input type="hidden" name="application_id" value={applicationId} />
      {nextId && <input type="hidden" name="next_id" value={nextId} />}
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="note" className="text-[13px] font-semibold">
          ملاحظة للطالب <span className="font-normal text-muted-foreground">(مطلوبة عند طلب التعديل أو الرفض)</span>
        </label>
        <Textarea id="note" name="note" rows={2} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} aria-invalid={state.fieldErrors?.note ? true : undefined} />
        {state.fieldErrors?.note && <p className="text-[13px] font-medium text-destructive">{state.fieldErrors.note}</p>}
      </div>
      <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
        <SubmitButton name="decision" value="approved" className="sm:flex-1">
          <Check className="size-4" aria-hidden="true" />
          قبول الطلب
        </SubmitButton>
        <div className="grid grid-cols-2 gap-2.5 sm:flex">
          <SubmitButton name="decision" value="needs_changes" variant="secondary">
            طلب تعديل
          </SubmitButton>
          <SubmitButton name="decision" value="rejected" variant="destructive">
            رفض
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}
