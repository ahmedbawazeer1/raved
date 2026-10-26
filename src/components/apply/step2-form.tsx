"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Alert, Checkbox, Field, FieldsetLegend, RadioOption, Select, Textarea } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { En } from "@/components/en";
import { saveStep2Draft, submitApplication, type ApplyFormState } from "@/app/(auth)/apply/actions";
import { DAILY_MINUTES, TARGET_DATES, TARGET_EXAMS } from "@/lib/apply/options";
import { AutosaveNote, useAutosave } from "./use-autosave";
import { RecommendationUpload, type UploadedFile } from "./recommendation-upload";

export interface Step2Initial {
  path_id: string;
  target_exam: string;
  target_date: string;
  daily_minutes: string;
  motivation: string;
}

export function Step2Form({
  userId,
  initial,
  paths,
  recommendation,
  reviewNote,
}: {
  userId: string;
  initial: Step2Initial;
  paths: { id: string; title: string }[];
  recommendation: UploadedFile | null;
  reviewNote?: string | null;
}) {
  const [values, setValues] = useState(initial);
  const [state, action] = useActionState<ApplyFormState, FormData>(submitApplication, {});
  const autosave = useAutosave(values, saveStep2Draft);
  const errors = state.fieldErrors ?? {};
  const set = (key: keyof Step2Initial) => (value: string) => setValues((v) => ({ ...v, [key]: value }));

  return (
    <form action={action} className="flex flex-1 flex-col" noValidate>
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-4">
        {reviewNote && (
          <Alert tone="warning">
            <b>ملاحظة فريق الإدارة:</b> {reviewNote}
          </Alert>
        )}
        {state.error && <Alert tone="error">{state.error}</Alert>}

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

        <fieldset className="m-0 border-0 p-0">
          <FieldsetLegend error={errors.target_exam}>
            أي امتحان تحتاجه؟ <span className="font-normal text-muted-foreground">(تستطيع تغييره لاحقاً)</span>
          </FieldsetLegend>
          <div className="grid grid-cols-2 gap-2.5">
            {TARGET_EXAMS.map((e) => (
              <RadioOption key={e.value} name="target_exam" value={e.value} checked={values.target_exam === e.value} onChange={set("target_exam")}>
                {e.value === "undecided" ? e.label : <En>{e.label}</En>}
              </RadioOption>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-[18px] md:grid-cols-2">
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
          <Field id="daily_minutes" label="كم دقيقة تستطيع يومياً؟" error={errors.daily_minutes}>
            <Select name="daily_minutes" value={values.daily_minutes} onChange={(e) => set("daily_minutes")(e.target.value)}>
              <option value="">اختر</option>
              {DAILY_MINUTES.map((m) => (
                <option key={m} value={m}>
                  {m} دقيقة
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field id="motivation" label="لماذا تريد الشهادة؟" optional error={errors.motivation}>
          <Textarea name="motivation" rows={2} maxLength={600} value={values.motivation} onChange={(e) => set("motivation")(e.target.value)} />
        </Field>

        <RecommendationUpload userId={userId} initial={recommendation} />

        <div className="flex flex-col gap-3 rounded-xl bg-background p-4">
          <label className="flex items-start gap-2.5 leading-[1.7]">
            <Checkbox name="guardian_consent" aria-invalid={errors.guardian_consent ? true : undefined} />
            ولي أمري يعلم بتسجيلي ويوافق عليه
          </label>
          {errors.guardian_consent && <p className="text-[13px] font-medium text-destructive">{errors.guardian_consent}</p>}
          <label className="flex items-start gap-2.5 leading-[1.7]">
            <Checkbox name="privacy_consent" aria-invalid={errors.privacy_consent ? true : undefined} />
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
        <AutosaveNote status={autosave} />
      </div>
      <footer className="sticky bottom-0 border-t border-border bg-card px-4 pt-3 pb-5">
        <div className="mx-auto max-w-2xl">
          <SubmitButton className="min-h-13 w-full" pendingLabel="جارٍ الإرسال…">
            إرسال الطلب
          </SubmitButton>
        </div>
      </footer>
    </form>
  );
}
