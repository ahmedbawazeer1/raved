"use client";

import { useActionState } from "react";
import { Alert, Field, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { addTeacher } from "@/app/(admin)/admin/teachers/actions";
import type { AdminFormState } from "@/app/(admin)/admin/actions";

export function AddTeacherForm() {
  const [state, action] = useActionState<AdminFormState, FormData>(addTeacher, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.message && <Alert tone="success">{state.message}</Alert>}
      <Field id="teacher-email" label="بريد المعلم">
        <Input id="teacher-email" name="email" type="email" dir="ltr" required autoComplete="off" placeholder="teacher@example.com" />
      </Field>
      <SubmitButton className="self-start" pendingLabel="جارٍ الإضافة…">
        أعطه صلاحية معلم
      </SubmitButton>
    </form>
  );
}
