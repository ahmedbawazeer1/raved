"use client";

import { useActionState } from "react";
import { Alert, Field, Input, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { En } from "@/components/en";
import { saveDefaults, saveExam, type AdminFormState } from "@/app/(admin)/admin/actions";

export interface ExamRow {
  code: string;
  name: string;
  availability_ye: string;
  locations: string;
  fee_note: string;
  payment_note: string;
  official_practice_url: string | null;
  verified_at: string | null;
}

export function ExamForm({ exam }: { exam: ExamRow }) {
  const [state, action] = useActionState<AdminFormState, FormData>(saveExam, {});
  const id = (f: string) => `${exam.code}-${f}`;
  return (
    <form action={action} className="flex flex-col gap-3 border-b border-muted py-4 last:border-b-0">
      <input type="hidden" name="code" value={exam.code} />
      <div className="flex items-center justify-between">
        <En as="p" className="text-base font-bold">
          {exam.name}
        </En>
        <span className="text-xs text-muted-foreground">
          {exam.verified_at ? `آخر تحقق: ${new Date(exam.verified_at).toLocaleDateString("ar")}` : "لم يُتحقق"}
        </span>
      </div>
      <Field id={id("availability_ye")} label="التوفر في اليمن">
        <Textarea name="availability_ye" rows={2} defaultValue={exam.availability_ye} />
      </Field>
      <Field id={id("locations")} label="المراكز والأماكن">
        <Textarea name="locations" rows={2} defaultValue={exam.locations} />
      </Field>
      <div className="grid gap-3 md:grid-cols-2">
        <Field id={id("fee_note")} label="ملاحظة الرسوم" hint="لا تكتب مبلغاً بالريال اليمني.">
          <Input name="fee_note" defaultValue={exam.fee_note} />
        </Field>
        <Field id={id("payment_note")} label="ملاحظة طريقة الدفع">
          <Input name="payment_note" defaultValue={exam.payment_note} />
        </Field>
      </div>
      <Field id={id("official_practice_url")} label="رابط التدريب الرسمي المجاني" optional>
        <Input name="official_practice_url" dir="ltr" type="url" defaultValue={exam.official_practice_url ?? ""} className="font-en" />
      </Field>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.message && <Alert tone="success">{state.message}</Alert>}
      <SubmitButton className="self-start" pendingLabel="جارٍ الحفظ…">
        حفظ وتسجيل التحقق اليوم
      </SubmitButton>
    </form>
  );
}

export function DefaultsForm({ dataSaver }: { dataSaver: boolean }) {
  const [state, action] = useActionState<AdminFormState, FormData>(saveDefaults, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <label className="flex min-h-11 items-center gap-3 text-sm font-semibold">
        <input type="checkbox" name="data_saver_default" defaultChecked={dataSaver} className="size-5 accent-[#0E6E5C]" />
        توفير الباقة مفعّل افتراضياً للطلاب الجدد
      </label>
      <p className="text-xs text-muted-foreground">حجم ملف الوحدة محدد بـ 2 ميجابايت كحد أقصى، حتى تُنزَّل بسرعة على الإنترنت الضعيف.</p>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.message && <Alert tone="success">{state.message}</Alert>}
      <SubmitButton className="self-start" pendingLabel="جارٍ الحفظ…">
        حفظ
      </SubmitButton>
    </form>
  );
}
