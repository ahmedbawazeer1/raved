"use client";

import { useActionState } from "react";
import { Alert, Checkbox, Field, Input, Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  changePassword,
  deleteAccount,
  saveProfile,
  saveStudySettings,
  type SettingsState,
} from "@/app/(student)/student/settings/actions";
import { DAILY_MINUTES } from "@/lib/apply/options";
import { formatYemeniMobileLocal, GRADES, STREAMS } from "@/lib/yemen";

function Status({ state }: { state: SettingsState }) {
  if (state.error) return <Alert tone="error">{state.error}</Alert>;
  if (state.message) return <Alert tone="success">{state.message}</Alert>;
  return null;
}

export function StudyForm({ minutes, dataSaver }: { minutes: number; dataSaver: boolean }) {
  const [state, action] = useActionState<SettingsState, FormData>(saveStudySettings, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <Field id="daily_goal_minutes" label="دقائق الدراسة اليومية">
        <Select name="daily_goal_minutes" defaultValue={String(minutes)}>
          {DAILY_MINUTES.map((m) => (
            <option key={m} value={m}>
              {m} دقيقة
            </option>
          ))}
        </Select>
      </Field>
      <label className="flex min-h-11 items-start gap-3 text-[15px]">
        <Checkbox name="data_saver" defaultChecked={dataSaver} />
        <span>
          <span className="block font-semibold">توفير الباقة</span>
          <span className="block text-sm text-muted-foreground">الفيديو لا يعمل تلقائياً، ولا يُحمَّل إلا عندما تضغط عليه.</span>
        </span>
      </label>
      <Status state={state} />
      <SubmitButton className="self-start" pendingLabel="جارٍ الحفظ…">
        حفظ
      </SubmitButton>
    </form>
  );
}

export interface ProfileInitial {
  full_name: string;
  school: string | null;
  city: string | null;
  governorate: string | null;
  grade: number | null;
  stream: string | null;
  phone: string | null;
}

export function ProfileForm({ initial, governorates }: { initial: ProfileInitial; governorates: { code: string; name_ar: string }[] }) {
  const [state, action] = useActionState<SettingsState, FormData>(saveProfile, {});
  const e = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-3">
      <Field id="full_name" label="الاسم الكامل" error={e.full_name}>
        <Input name="full_name" defaultValue={initial.full_name} autoComplete="name" />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="governorate" label="المحافظة" error={e.governorate}>
          <Select name="governorate" defaultValue={initial.governorate ?? ""}>
            <option value="">اختر</option>
            {governorates.map((g) => (
              <option key={g.code} value={g.code}>
                {g.name_ar}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="city" label="المدينة أو المديرية" error={e.city}>
          <Input name="city" defaultValue={initial.city ?? ""} />
        </Field>
      </div>
      <Field id="school" label="المدرسة" error={e.school}>
        <Input name="school" defaultValue={initial.school ?? ""} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="grade" label="الصف" error={e.grade}>
          <Select name="grade" defaultValue={String(initial.grade ?? "")}>
            {GRADES.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="stream" label="القسم" error={e.stream}>
          <Select name="stream" defaultValue={initial.stream ?? "undecided"}>
            {STREAMS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field id="phone" label="رقم الجوال" hint="يراه فريق الإدارة فقط." error={e.phone}>
        <Input name="phone" dir="ltr" inputMode="tel" defaultValue={initial.phone ? formatYemeniMobileLocal(initial.phone) : ""} className="font-en" />
      </Field>
      <Status state={state} />
      <SubmitButton className="self-start" pendingLabel="جارٍ الحفظ…">
        حفظ بياناتي
      </SubmitButton>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState<SettingsState, FormData>(changePassword, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <Field id="password" label="كلمة المرور الجديدة" hint="8 أحرف على الأقل.">
        <Input name="password" type="password" autoComplete="new-password" minLength={8} />
      </Field>
      <Field id="confirm" label="أعد كتابتها">
        <Input name="confirm" type="password" autoComplete="new-password" minLength={8} />
      </Field>
      <Status state={state} />
      <SubmitButton variant="secondary" className="self-start" pendingLabel="جارٍ الحفظ…">
        غيّر كلمة المرور
      </SubmitButton>
    </form>
  );
}

export function DeleteAccountForm() {
  const [state, action] = useActionState<SettingsState, FormData>(deleteAccount, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <p className="text-sm leading-relaxed text-muted-foreground">
        يُحذف حسابك وكل بياناتك (تقدمك، وكتاباتك، وطلب الالتحاق وتوصية المعلم) نهائياً، ولا يمكن استرجاعها. نزّل بياناتك أولاً إن أردت الاحتفاظ بنسخة.
      </p>
      <Field id="confirm_delete" label="للتأكيد اكتب: احذف حسابي">
        <Input name="confirm" autoComplete="off" />
      </Field>
      <Status state={state} />
      <SubmitButton variant="destructive" className="self-start" pendingLabel="جارٍ الحذف…">
        احذف حسابي نهائياً
      </SubmitButton>
    </form>
  );
}
