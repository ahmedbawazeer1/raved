"use client";

import { useActionState, useState, useTransition } from "react";
import { Eye } from "lucide-react";
import { Alert } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { revealStudentPhone, setStudentStatus, type AdminFormState } from "@/app/(admin)/admin/actions";

/** Shows the masked phone; revealing it is recorded in the audit log. */
export function RevealPhone({ studentId, masked }: { studentId: string; masked: string }) {
  const [phone, setPhone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span dir="ltr" className="font-en">
        {phone ?? masked}
      </span>
      {!phone && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={busy}
          onClick={() =>
            start(async () => {
              const res = await revealStudentPhone(studentId);
              if (res.phone) setPhone(res.phone);
              else setError(res.error ?? "حدث خطأ.");
            })
          }
        >
          <Eye className="size-4" aria-hidden="true" />
          إظهار (يُسجَّل)
        </Button>
      )}
      {error && <span className="text-sm text-destructive">{error}</span>}
    </span>
  );
}

export function StudentStatusForm({ studentId, status }: { studentId: string; status: string }) {
  const [state, action] = useActionState<AdminFormState, FormData>(setStudentStatus, {});
  const suspend = status !== "suspended";
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="student_id" value={studentId} />
      <input type="hidden" name="status" value={suspend ? "suspended" : "active"} />
      <SubmitButton variant={suspend ? "destructive" : "primary"} className="self-start" pendingLabel="…">
        {suspend ? "أوقف الحساب" : "أعد تفعيل الحساب"}
      </SubmitButton>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.message && <Alert tone="success">{state.message}</Alert>}
    </form>
  );
}
