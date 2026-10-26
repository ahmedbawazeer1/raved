"use client";

import { useActionState } from "react";
import { Alert, Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { saveSettings, type AdminFormState } from "@/app/(admin)/admin/actions";

export function SettingsForm({ admissionMode }: { admissionMode: string }) {
  const [state, action] = useActionState<AdminFormState, FormData>(saveSettings, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.message && <Alert tone="success">{state.message}</Alert>}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex-1">
          <label htmlFor="admission_mode" className="font-semibold">
            نمط القبول
          </label>
          <p className="text-sm text-muted-foreground">بالمراجعة: الإدارة تقبل كل طلب. تلقائي: يُقبل فور إرساله مع التوصية وموافقة ولي الأمر.</p>
        </div>
        <Select id="admission_mode" name="admission_mode" defaultValue={admissionMode} className="md:w-48">
          <option value="review">بالمراجعة</option>
          <option value="auto">تلقائي</option>
        </Select>
      </div>
      <SubmitButton className="self-start" pendingLabel="جارٍ الحفظ…">
        حفظ
      </SubmitButton>
    </form>
  );
}
