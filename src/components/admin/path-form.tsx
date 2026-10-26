"use client";

import { useActionState, useState } from "react";
import { Alert, Field, Input, RadioOption, Select, Switch, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { notifyWaitlist, savePath, type AdminFormState } from "@/app/(admin)/admin/actions";
import { PATH_FEATURES, PATH_STATUSES, type PathFeatures } from "@/lib/paths/features";

export interface PathFormValues {
  id?: string;
  title: string;
  slug: string;
  summary: string;
  description: string;
  status: string;
  position: number;
  icon: string;
  est_months: number | null;
  daily_minutes: number;
  features: PathFeatures;
}

const ICONS = [
  { value: "book", label: "كتاب" },
  { value: "code", label: "برمجة" },
  { value: "database", label: "بيانات" },
  { value: "pen", label: "تصميم" },
];

export function PathForm({ path, waitlistCount }: { path: PathFormValues; waitlistCount: number }) {
  const [state, action] = useActionState<AdminFormState, FormData>(savePath, {});
  const [notifyState, notifyAction] = useActionState<AdminFormState, FormData>(notifyWaitlist, {});
  const [status, setStatus] = useState(path.status);
  const errors = state.fieldErrors ?? {};

  return (
    <div className="flex flex-col gap-4">
      <form action={action} className="flex flex-col gap-4" noValidate>
        {path.id && <input type="hidden" name="id" value={path.id} />}
        {state.error && <Alert tone="error">{state.error}</Alert>}
        <div className="grid gap-4 md:grid-cols-2">
          <Field id="title" label="الاسم" error={errors.title}>
            <Input name="title" defaultValue={path.title} required />
          </Field>
          <Field id="slug" label="الرابط" error={errors.slug} hint={<>يظهر في العنوان: <span dir="ltr" className="font-en">/paths/web</span></>}>
            <Input name="slug" dir="ltr" className="font-en text-end" defaultValue={path.slug} required />
          </Field>
        </div>
        <Field id="summary" label="وصف قصير (للبطاقة)" error={errors.summary}>
          <Input name="summary" defaultValue={path.summary} maxLength={200} />
        </Field>
        <Field id="description" label="الوصف (لصفحة المسار)" error={errors.description}>
          <Textarea name="description" rows={3} defaultValue={path.description} maxLength={1500} />
        </Field>

        <fieldset className="m-0 border-0 p-0">
          <legend className="mb-2.5 text-sm font-semibold">الحالة</legend>
          <div className="grid gap-2.5 md:grid-cols-3">
            {PATH_STATUSES.map((s) => (
              <RadioOption key={s.value} name="status" value={s.value} checked={status === s.value} onChange={setStatus}>
                {s.label}
              </RadioOption>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field id="position" label="الترتيب" error={errors.position}>
            <Input name="position" type="number" min={0} max={999} dir="ltr" className="font-en text-end" defaultValue={path.position} />
          </Field>
          <Field id="icon" label="الأيقونة">
            <Select name="icon" defaultValue={path.icon}>
              {ICONS.map((i) => (
                <option key={i.value} value={i.value}>
                  {i.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="est_months" label="المدة بالأشهر" optional error={errors.est_months}>
            <Input name="est_months" type="number" min={1} max={119} dir="ltr" className="font-en text-end" defaultValue={path.est_months ?? ""} />
          </Field>
          <Field id="daily_minutes" label="دقائق يومياً" error={errors.daily_minutes}>
            <Input name="daily_minutes" type="number" min={5} max={240} dir="ltr" className="font-en text-end" defaultValue={path.daily_minutes} />
          </Field>
        </div>

        <fieldset className="m-0 border-0 p-0">
          <legend className="mb-1 text-sm font-semibold">الميزات</legend>
          <div className="grid gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
            {PATH_FEATURES.map((f) => (
              <Switch key={f.key} name={`feature_${f.key}`} defaultChecked={path.features[f.key]} label={f.label} />
            ))}
          </div>
        </fieldset>

        <div className="flex flex-wrap gap-3">
          <SubmitButton pendingLabel="جارٍ الحفظ…">حفظ</SubmitButton>
        </div>
      </form>

      {path.id && path.status === "published" && (
        <form action={notifyAction} className="flex flex-col gap-2 rounded-xl bg-background p-4">
          <input type="hidden" name="path_id" value={path.id} />
          <p className="text-sm">
            في قائمة الانتظار: <b>{waitlistCount}</b> لم يُبلَّغوا بعد.
          </p>
          {notifyState.error && <Alert tone="error">{notifyState.error}</Alert>}
          {notifyState.message && <Alert tone="success">{notifyState.message}</Alert>}
          <SubmitButton variant="secondary" className="self-start" disabled={waitlistCount === 0} pendingLabel="جارٍ الإرسال…">
            إرسال إشعار لقائمة الانتظار
          </SubmitButton>
        </form>
      )}
    </div>
  );
}
