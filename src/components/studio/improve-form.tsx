"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import type { AdminFormState } from "@/app/(admin)/admin/actions";
import { improveUnit } from "@/app/(studio)/studio/units/actions";

export function ImproveUnitForm({ unitId, note }: { unitId: string; note: string }) {
  const [state, action] = useActionState<AdminFormState, FormData>(improveUnit, {});
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="unit_id" value={unitId} />
      <input type="hidden" name="note" value={note} />
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.message && <Alert tone="success">{state.message}</Alert>}
      <SubmitButton size="sm" className="self-start" pendingLabel="جارٍ الإرسال…">
        أعد بناء الوحدة بهذه الملاحظات
      </SubmitButton>
    </form>
  );
}
