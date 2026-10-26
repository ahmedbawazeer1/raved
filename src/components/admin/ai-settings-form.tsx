"use client";

import { useActionState } from "react";
import { Alert, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { saveAiSettings, type AdminFormState } from "@/app/(admin)/admin/actions";

export function AiSettingsForm(v: { speaking: number; writing: number; assistant: number; quota: number; alert: number; paused: boolean }) {
  const [state, action] = useActionState<AdminFormState, FormData>(saveAiSettings, {});
  const field = (name: string, label: string, value: number, hint?: string) => (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-semibold">
        {label}
      </label>
      <Input id={name} name={name} type="number" inputMode="numeric" defaultValue={value} min={0} className="font-en" />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
  return (
    <form action={action} className="flex flex-col gap-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.message && <Alert tone="success">{state.message}</Alert>}
      <p className="text-sm text-muted-foreground">الحد اليومي لكل طالب. المحاولة التي تفشل لا تُحسب عليه.</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {field("speaking", "تقييمات المحادثة", v.speaking)}
        {field("writing", "تصحيحات الكتابة", v.writing)}
        {field("assistant", "أسئلة المساعد", v.assistant)}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {field("quota", "الحصة المجانية اليومية لـ Groq (طلبات)", v.quota, "من صفحة Limits في حساب Groq.")}
        {field("alert", "نبّهني عند استهلاك (%)", v.alert)}
      </div>
      <label className="flex min-h-11 items-center gap-3 text-sm font-semibold">
        <input type="checkbox" name="paused" defaultChecked={v.paused} className="size-5 accent-[#0E6E5C]" />
        إيقاف التقييم الآلي مؤقتاً لكل الطلاب
      </label>
      <SubmitButton className="self-start" pendingLabel="جارٍ الحفظ…">
        حفظ
      </SubmitButton>
    </form>
  );
}
