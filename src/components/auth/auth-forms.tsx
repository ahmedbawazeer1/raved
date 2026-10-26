"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Alert, Field, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  login,
  requestPasswordReset,
  signup,
  updatePassword,
  type AuthFormState,
} from "@/app/(auth)/actions";

const initial: AuthFormState = {};

export function LoginForm({ next, notice }: { next?: string; notice?: string }) {
  const [state, action] = useActionState(login, initial);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {notice && <Alert tone="warning">{notice}</Alert>}
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {next && <input type="hidden" name="next" value={next} />}
      <Field id="email" label="البريد الإلكتروني" error={state.fieldErrors?.email || undefined}>
        <Input
          name="email"
          type="email"
          dir="ltr"
          className="text-end"
          placeholder="name@example.com"
          autoComplete="email"
          defaultValue={state.email}
          required
        />
      </Field>
      <div className="flex flex-col gap-2">
        <Field id="password" label="كلمة المرور" error={state.fieldErrors?.password || undefined}>
          <Input name="password" type="password" autoComplete="current-password" required />
        </Field>
        <Link href="/forgot" className="inline-flex min-h-8 items-center self-start text-sm font-semibold">
          نسيت كلمة المرور؟
        </Link>
      </div>
      <SubmitButton pendingLabel="جارٍ الدخول…">تسجيل الدخول</SubmitButton>
    </form>
  );
}

export function SignupForm() {
  const [state, action] = useActionState(signup, initial);
  if (state.sent) {
    return (
      <Alert tone="success">
        <b>بقيت خطوة واحدة.</b> أرسلنا رابط التأكيد إلى <span dir="ltr">{state.email}</span>. افتح بريدك واضغط
        الرابط، ثم تكمل بياناتك. (تحقق من مجلد الرسائل غير المرغوبة Spam أيضاً.)
      </Alert>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <Field id="full_name" label="اسمك الكامل" error={state.fieldErrors?.full_name}>
        <Input name="full_name" autoComplete="name" required />
      </Field>
      <Field
        id="email"
        label="البريد الإلكتروني"
        error={state.fieldErrors?.email}
        hint={
          <a href="https://support.google.com/mail/answer/56256?hl=ar" target="_blank" rel="noopener noreferrer">
            ليس لديك بريد؟ هكذا تنشئ بريد Gmail مجاناً
          </a>
        }
      >
        <Input name="email" type="email" dir="ltr" className="text-end" placeholder="name@gmail.com" autoComplete="email" required />
      </Field>
      <Field id="password" label="كلمة المرور" error={state.fieldErrors?.password} hint="8 أحرف على الأقل">
        <Input name="password" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      <SubmitButton pendingLabel="جارٍ إنشاء الحساب…" className="min-h-12">
        إنشاء الحساب
      </SubmitButton>
    </form>
  );
}

export function ForgotForm() {
  const [state, action] = useActionState(requestPasswordReset, initial);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <Field id="email" label="البريد الإلكتروني" error={state.fieldErrors?.email}>
        <Input name="email" type="email" dir="ltr" className="text-end" autoComplete="email" defaultValue={state.email} required />
      </Field>
      <SubmitButton pendingLabel="جارٍ الإرسال…" className="min-h-12">
        أرسل رابط الاستعادة
      </SubmitButton>
      {state.sent && (
        <Alert tone="success">
          <b>أرسلنا الرابط.</b> افتح بريدك (وتحقق من مجلد الرسائل غير المرغوبة). الرابط صالح لساعة واحدة.
        </Alert>
      )}
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, action] = useActionState(updatePassword, initial);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <Field id="password" label="كلمة المرور الجديدة" error={state.fieldErrors?.password} hint="8 أحرف على الأقل">
        <Input name="password" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      <Field id="confirm" label="أعد كتابتها" error={state.fieldErrors?.confirm}>
        <Input name="confirm" type="password" autoComplete="new-password" required />
      </Field>
      <SubmitButton pendingLabel="جارٍ الحفظ…" className="min-h-12">
        احفظ كلمة المرور
      </SubmitButton>
    </form>
  );
}
