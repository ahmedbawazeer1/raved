"use client";

import { useActionState } from "react";
import type { AppConfig } from "@shared/app-config";
import { Alert, Checkbox, Field, Input, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { saveAppConfig, type AdminFormState } from "@/app/(admin)/admin/actions";

const FEATURES: { key: string; label: string }[] = [
  { key: "games", label: "الألعاب" },
  { key: "league", label: "الدوري الأسبوعي" },
  { key: "duel", label: "تحدي صديق" },
  { key: "roleplay", label: "المحادثة مع الشخصيات" },
  { key: "assistant", label: "المساعد" },
  { key: "speaking", label: "مهمة التحدث" },
  { key: "writing", label: "مهمة الكتابة" },
];

/** Controls the mobile app without a new release: feature switches, a notice and forced updates. */
export function AppConfigForm({ config }: { config: AppConfig }) {
  const [state, action] = useActionState<AdminFormState, FormData>(saveAppConfig, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.message && <Alert tone="success">{state.message}</Alert>}
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-semibold">الميزات الظاهرة في التطبيق</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <label key={f.key} className="flex min-h-11 items-center gap-2">
              <Checkbox name={`feature_${f.key}`} defaultChecked={config.features[f.key] !== false} />
              {f.label}
            </label>
          ))}
        </div>
      </fieldset>
      <Field id="notice_ar" label="رسالة تظهر أعلى التطبيق لكل الطلاب (اتركها فارغة لإخفائها)">
        <Textarea id="notice_ar" name="notice_ar" rows={2} maxLength={300} defaultValue={config.notice_ar ?? ""} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="latest_version" label="آخر نسخة (تظهر «تحديث متوفر» لمن قبلها)">
          <Input id="latest_version" name="latest_version" dir="ltr" defaultValue={config.latest_version} />
        </Field>
        <Field id="min_version" label="أقل نسخة مسموحة (من قبلها يجب أن يحدّث)">
          <Input id="min_version" name="min_version" dir="ltr" defaultValue={config.min_version} />
        </Field>
      </div>
      <Field id="store_url" label="رابط التحديث (Google Play أو صفحة التحميل)">
        <Input id="store_url" name="store_url" dir="ltr" defaultValue={config.store_url ?? ""} placeholder="https://raved-seven.vercel.app/app" />
      </Field>
      <SubmitButton className="self-start" pendingLabel="جارٍ الحفظ…">
        حفظ إعدادات التطبيق
      </SubmitButton>
    </form>
  );
}
