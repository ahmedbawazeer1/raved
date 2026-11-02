"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Alert, Checkbox, Field, FieldsetLegend, RadioOption, Select, Textarea } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { En } from "@/components/en";
import { saveStep2Draft, submitApplication, type ApplyFormState } from "@/app/(auth)/apply/actions";
import { DAILY_MINUTES, TARGET_DATES, TARGET_EXAMS } from "@/lib/apply/options";
import { AutosaveNote, useAutosave } from "./use-autosave";
import { TOTAL_APPLY_STEPS } from "./steps";
import { Wizard } from "./wizard";

export interface Step2Initial {
  path_id: string;
  target_exam: string;
  target_date: string;
  daily_minutes: string;
  motivation: string;
}

export function Step2Form({ initial, paths, reviewNote }: { initial: Step2Initial; paths: { id: string; title: string }[]; reviewNote?: string | null }) {
  const [values, setValues] = useState(initial);
  const [state, action] = useActionState<ApplyFormState, FormData>(submitApplication, {});
  const autosave = useAutosave(values, saveStep2Draft);
  const errors = state.fieldErrors ?? {};
  const set = (key: keyof Step2Initial) => (value: string) => setValues((v) => ({ ...v, [key]: value }));

  const [consents, setConsents] = useState({ guardian: false, privacy: false });

  const steps = [
    {
      key: "path",
      title: "اختر مسارك",
      hint: "من أين تبدأ رحلتك؟ ستُضاف مسارات أخرى قريباً.",
      fields: ["path_id"],
      check: () => (values.path_id ? null : "اختر مساراً لتبدأ به."),
      content: (
        <fieldset className="m-0 border-0 p-0">
          <FieldsetLegend error={errors.path_id}>المسار الذي تبدأ به</FieldsetLegend>
          <div className="grid gap-2.5">
            {paths.map((p) => (
              <RadioOption
                key={p.id}
                name="path_id"
                value={p.id}
                checked={values.path_id === p.id}
                onChange={set("path_id")}
                aside={<Badge tone="warning">متاح</Badge>}
              >
                {p.title}
              </RadioOption>
            ))}
          </div>
        </fieldset>
      ),
    },
    {
      key: "exam",
      title: "ما هدفك؟",
      hint: "أي امتحان دولي تحتاجه؟ إن لم تقرر بعد فلا بأس، تستطيع تغييره لاحقاً.",
      fields: ["target_exam"],
      check: () => (values.target_exam ? null : "اختر امتحاناً أو «لم أقرر بعد»."),
      content: (
        <fieldset className="m-0 border-0 p-0">
          <FieldsetLegend error={errors.target_exam}>أي امتحان تحتاجه؟</FieldsetLegend>
          <div className="grid grid-cols-2 gap-2.5">
            {TARGET_EXAMS.map((e) => (
              <RadioOption key={e.value} name="target_exam" value={e.value} checked={values.target_exam === e.value} onChange={set("target_exam")}>
                {e.value === "undecided" ? e.label : <En>{e.label}</En>}
              </RadioOption>
            ))}
          </div>
        </fieldset>
      ),
    },
    {
      key: "time",
      title: "وقتك",
      hint: "متى تحتاج الشهادة، وكم دقيقة تستطيع يومياً؟ القليل كل يوم أفضل من الكثير مرة.",
      fields: ["target_date", "daily_minutes"],
      check: () => (values.target_date && values.daily_minutes ? null : "اختر الموعد والدقائق اليومية."),
      content: (
        <>
          <Field id="target_date" label="متى تحتاج الشهادة تقريباً؟" error={errors.target_date}>
            <Select name="target_date" value={values.target_date} onChange={(e) => set("target_date")(e.target.value)}>
              <option value="">اختر</option>
              {TARGET_DATES.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </Select>
          </Field>
          <fieldset className="m-0 border-0 p-0">
            <FieldsetLegend error={errors.daily_minutes}>كم دقيقة تستطيع يومياً؟</FieldsetLegend>
            <div className="grid grid-cols-3 gap-2.5">
              {DAILY_MINUTES.map((m) => (
                <RadioOption key={m} name="daily_minutes" value={String(m)} checked={values.daily_minutes === String(m)} onChange={set("daily_minutes")}>
                  <span className="font-en">{m}</span> دقيقة
                </RadioOption>
              ))}
            </div>
          </fieldset>
        </>
      ),
    },
    {
      key: "consent",
      title: "آخر خطوة",
      hint: "لماذا تريد الشهادة؟ ثم موافقة ولي أمرك وسياسة الخصوصية.",
      fields: ["motivation", "guardian_consent", "privacy_consent"],
      content: (
        <>
          <Field id="motivation" label="لماذا تريد الشهادة؟" optional error={errors.motivation}>
            <Textarea name="motivation" rows={2} maxLength={600} value={values.motivation} onChange={(e) => set("motivation")(e.target.value)} />
          </Field>
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
            <label className="flex min-h-11 items-start gap-2.5 leading-[1.7]">
              <Checkbox
                name="guardian_consent"
                checked={consents.guardian}
                onChange={(e) => setConsents((c) => ({ ...c, guardian: e.target.checked }))}
                aria-invalid={errors.guardian_consent ? true : undefined}
              />
              ولي أمري يعلم بتسجيلي ويوافق عليه
            </label>
            {errors.guardian_consent && <p className="text-[13px] font-medium text-destructive">{errors.guardian_consent}</p>}
            <label className="flex min-h-11 items-start gap-2.5 leading-[1.7]">
              <Checkbox
                name="privacy_consent"
                checked={consents.privacy}
                onChange={(e) => setConsents((c) => ({ ...c, privacy: e.target.checked }))}
                aria-invalid={errors.privacy_consent ? true : undefined}
              />
              <span>
                قرأت{" "}
                <Link href="/privacy" target="_blank">
                  سياسة الخصوصية
                </Link>{" "}
                و
                <Link href="/terms" target="_blank">
                  شروط الاستخدام
                </Link>{" "}
                وأوافق عليها
              </span>
            </label>
            {errors.privacy_consent && <p className="text-[13px] font-medium text-destructive">{errors.privacy_consent}</p>}
          </div>
        </>
      ),
    },
  ];

  return (
    <form action={action} className="flex flex-1 flex-col" noValidate>
      <Wizard
        steps={steps}
        offset={4}
        total={TOTAL_APPLY_STEPS}
        backHref="/apply"
        submitLabel="إرسال الطلب 🚀"
        pendingLabel="جارٍ الإرسال…"
        error={state.error}
        errorFields={Object.keys(errors)}
        footerNote={
          <>
            {reviewNote && (
              <Alert tone="warning">
                <b>ملاحظة فريق الإدارة:</b> {reviewNote}
              </Alert>
            )}
            <AutosaveNote status={autosave} />
          </>
        }
      />
    </form>
  );
}
