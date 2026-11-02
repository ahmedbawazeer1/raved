"use client";

import { useActionState, useState } from "react";
import { Field, FieldsetLegend, Input, RadioOption, Select } from "@/components/ui/form";
import { En } from "@/components/en";
import { completeStep1, saveStep1Draft, type ApplyFormState } from "@/app/(auth)/apply/actions";
import { GRADES, STREAMS, formatYemeniMobileLocal, normalizeYemeniMobile } from "@/lib/yemen";
import { TOTAL_APPLY_STEPS } from "./steps";
import { Wizard } from "./wizard";
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

  const need = (...keys: (keyof typeof values)[]) => (keys.some((k) => !values[k].trim()) ? "أكمل الخانات قبل المتابعة." : null);

  const steps = [
    {
      key: "you",
      title: "عرّفنا بنفسك",
      hint: "اسمك كما تحب أن يظهر في شهادتك، وتاريخ ميلادك.",
      fields: ["full_name", "birth_date"],
      check: () => need("full_name", "birth_date"),
      content: (
        <>
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
        </>
      ),
    },
    {
      key: "place",
      title: "من أين أنت؟",
      hint: "محافظتك ومدينتك، لنعرف طلابنا في كل اليمن.",
      fields: ["governorate", "city"],
      check: () => need("governorate", "city"),
      content: (
        <>
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
        </>
      ),
    },
    {
      key: "school",
      title: "دراستك",
      hint: "مدرستك وصفّك وقسمك.",
      fields: ["school", "grade", "stream"],
      check: () => need("school", "grade", "stream"),
      content: (
        <>
          <Field id="school" label="اسم المدرسة" error={errors.school}>
            <Input name="school" placeholder="مثال: مدرسة الشعب الثانوية" value={values.school} onChange={(e) => set("school")(e.target.value)} />
          </Field>
          <fieldset className="m-0 border-0 p-0">
            <FieldsetLegend error={errors.grade}>الصف</FieldsetLegend>
            <div className="grid gap-2.5 sm:grid-cols-3">
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
            <div className="grid gap-2.5 sm:grid-cols-3">
              {STREAMS.map((st) => (
                <RadioOption key={st.value} name="stream" value={st.value} checked={values.stream === st.value} onChange={set("stream")}>
                  {st.label}
                </RadioOption>
              ))}
            </div>
          </fieldset>
        </>
      ),
    },
    {
      key: "phone",
      title: "رقم هاتفك",
      hint: "للتواصل معك عند الحاجة فقط. لا نرسل رسائل SMS.",
      fields: ["phone"],
      check: () => (normalizeYemeniMobile(values.phone) ? null : "اكتب رقم جوال يمني صحيحاً: 9 أرقام يبدأ بـ 7."),
      content: (
        <div className="flex flex-col gap-2">
          <label htmlFor="phone" className="text-sm font-semibold">
            رقم هاتفك
          </label>
          <div className="flex gap-2" dir="ltr">
            <En className="flex min-h-12 w-[90px] flex-none items-center justify-center rounded-xl border border-input bg-background text-[15px]">+967</En>
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
            يراه فريق الإدارة فقط.
          </p>
          {errors.phone && <p className="text-[13px] font-medium text-destructive">{errors.phone}</p>}
        </div>
      ),
    },
  ];

  return (
    <form action={action} className="flex flex-1 flex-col" noValidate>
      <Wizard
        steps={steps}
        total={TOTAL_APPLY_STEPS}
        backHref="/"
        submitLabel="التالي: هدفك"
        pendingLabel="جارٍ الحفظ…"
        error={state.error}
        errorFields={Object.keys(errors)}
        footerNote={<AutosaveNote status={autosave} />}
      />
    </form>
  );
}
