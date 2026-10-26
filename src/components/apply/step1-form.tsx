"use client";

import { useActionState, useState } from "react";
import { Alert, Field, FieldsetLegend, Input, RadioOption, Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { En } from "@/components/en";
import { completeStep1, saveStep1Draft, type ApplyFormState } from "@/app/(auth)/apply/actions";
import { GRADES, STREAMS, formatYemeniMobileLocal } from "@/lib/yemen";
import { AutosaveNote, useAutosave } from "./use-autosave";

export interface Step1Initial {
  full_name: string;
  birth_date: string;
  governorate: string;
  city: string;
  school: string;
  grade: string;
  stream: string;
  phone: string;
}

export function Step1Form({ initial, governorates }: { initial: Step1Initial; governorates: { code: string; name_ar: string }[] }) {
  const [values, setValues] = useState(() => ({
    ...initial,
    phone: initial.phone ? formatYemeniMobileLocal(initial.phone) : "",
  }));
  const [state, action] = useActionState<ApplyFormState, FormData>(completeStep1, {});
  const autosave = useAutosave(values, saveStep1Draft);
  const errors = state.fieldErrors ?? {};
  const set = (key: keyof typeof values) => (value: string) => setValues((v) => ({ ...v, [key]: value }));

  return (
    <form action={action} className="flex flex-1 flex-col" noValidate>
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-4">
        {state.error && <Alert tone="error">{state.error}</Alert>}
        <div className="grid gap-[18px] md:grid-cols-2">
          <Field id="full_name" label="اسمك الكامل" error={errors.full_name}>
            <Input name="full_name" value={values.full_name} onChange={(e) => set("full_name")(e.target.value)} autoComplete="name" />
          </Field>
          <Field id="birth_date" label="تاريخ الميلاد" error={errors.birth_date}>
            <Input
              name="birth_date"
              type="date"
              dir="ltr"
              className="text-end"
              min="2000-01-01"
              max="2016-12-31"
              value={values.birth_date}
              onChange={(e) => set("birth_date")(e.target.value)}
            />
          </Field>
          <Field id="governorate" label="المحافظة" error={errors.governorate}>
            <Select name="governorate" value={values.governorate} onChange={(e) => set("governorate")(e.target.value)}>
              <option value="">اختر محافظتك</option>
              {governorates.map((g) => (
                <option key={g.code} value={g.code}>
                  {g.name_ar}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="city" label="المدينة أو المديرية" error={errors.city}>
            <Input name="city" value={values.city} onChange={(e) => set("city")(e.target.value)} />
          </Field>
          <Field id="school" label="اسم المدرسة" error={errors.school} className="md:col-span-2">
            <Input
              name="school"
              placeholder="مثال: مدرسة الشعب الثانوية"
              value={values.school}
              onChange={(e) => set("school")(e.target.value)}
            />
          </Field>
        </div>

        <fieldset className="m-0 border-0 p-0">
          <FieldsetLegend error={errors.grade}>الصف</FieldsetLegend>
          <div className="grid gap-2.5 md:grid-cols-3">
            {GRADES.map((g) => (
              <RadioOption key={g.value} name="grade" value={String(g.value)} checked={values.grade === String(g.value)} onChange={set("grade")}>
                {g.label}
              </RadioOption>
            ))}
          </div>
        </fieldset>

        <fieldset className="m-0 border-0 p-0">
          <FieldsetLegend error={errors.stream}>
            القسم <span className="font-normal text-muted-foreground">(من الثاني الثانوي)</span>
          </FieldsetLegend>
          <div className="grid gap-2.5 md:grid-cols-3">
            {STREAMS.map((s) => (
              <RadioOption key={s.value} name="stream" value={s.value} checked={values.stream === s.value} onChange={set("stream")}>
                {s.label}
              </RadioOption>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col gap-2">
          <label htmlFor="phone" className="text-sm font-semibold">
            رقم هاتفك
          </label>
          <div className="flex gap-2" dir="ltr">
            <En className="flex min-h-12 w-[90px] flex-none items-center justify-center rounded-xl border border-input bg-background text-[15px]">
              +967
            </En>
            <Input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              className="font-en"
              placeholder="77 123 4567"
              value={values.phone}
              onChange={(e) => set("phone")(e.target.value)}
              aria-invalid={errors.phone ? true : undefined}
              aria-describedby="phone-hint"
            />
          </div>
          <p id="phone-hint" className="text-xs text-muted-foreground">
            لا نرسل رسائل SMS. يراه فريق الإدارة فقط، للتواصل معك عند الحاجة.
          </p>
          {errors.phone && <p className="text-[13px] font-medium text-destructive">{errors.phone}</p>}
        </div>
        <AutosaveNote status={autosave} />
      </div>
      <footer className="sticky bottom-0 border-t border-border bg-card px-4 pt-3 pb-5">
        <div className="mx-auto max-w-2xl">
          <SubmitButton className="min-h-13 w-full" pendingLabel="جارٍ الحفظ…">
            التالي: هدفك
          </SubmitButton>
        </div>
      </footer>
    </form>
  );
}
