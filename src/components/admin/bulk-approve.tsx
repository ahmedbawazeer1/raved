"use client";

import { useActionState, useState } from "react";
import { CheckCheck } from "lucide-react";
import { Alert } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { approveApplications, type AdminFormState } from "@/app/(admin)/admin/actions";

/** «قبول المكتملة»: every waiting application with both consents, after one confirmation. */
export function BulkApprove({ ids }: { ids: string[] }) {
  const [state, action] = useActionState<AdminFormState, FormData>(approveApplications, {});
  const [sure, setSure] = useState(false);
  if (state.message) return <Alert tone="success">{state.message}</Alert>;
  return (
    <form action={action} className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3">
      {ids.map((id) => (
        <input key={id} type="hidden" name="application_id" value={id} />
      ))}
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <span className="min-w-[200px] flex-1 text-sm">
        <b>{ids.length}</b> طلبات مكتملة (موافقة ولي الأمر والخصوصية).
      </span>
      {!sure ? (
        <Button type="button" variant="secondary" onClick={() => setSure(true)}>
          <CheckCheck className="size-4" aria-hidden="true" /> اقبلها كلها
        </Button>
      ) : (
        <>
          <span className="text-sm font-semibold">يصل لكل طالب بريد ترحيب. متأكد؟</span>
          <SubmitButton pendingLabel="جارٍ القبول…">نعم، اقبلها</SubmitButton>
          <Button type="button" variant="secondary" onClick={() => setSure(false)}>
            إلغاء
          </Button>
        </>
      )}
    </form>
  );
}
