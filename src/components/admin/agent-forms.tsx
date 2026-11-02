"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Alert, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { addRule, queuePlan, reviewJob } from "@/app/(admin)/admin/agent/actions";
import type { AdminFormState } from "@/app/(admin)/admin/actions";

export function QueuePlanForm({ paths }: { paths: { id: string; title: string }[] }) {
  const [state, action] = useActionState<AdminFormState, FormData>(queuePlan, {});
  return (
    <form action={action} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <label className="flex flex-1 flex-col gap-1.5 text-sm font-semibold">
        المسار
        <Select name="path_id" defaultValue={paths[0]?.id}>
          {paths.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </Select>
      </label>
      <SubmitButton pendingLabel="جارٍ الإرسال…" className="min-h-12">
        صمّم المسار كاملاً
      </SubmitButton>
      {state.error && <Alert tone="error">{state.error}</Alert>}
    </form>
  );
}

export function ReviewJobForm({ jobId }: { jobId: string }) {
  const [state, action] = useActionState<AdminFormState, FormData>(reviewJob, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="job_id" value={jobId} />
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        ملاحظتك للوكيل (مطلوبة عند الرفض، ويحفظها ويلتزم بها دائماً)
        <Textarea name="note" rows={3} maxLength={1000} placeholder="مثال: اجعل وحدات A1 عشرين وحدة فقط، وابدأ بالأرقام قبل العائلة." />
      </label>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.message && <Alert tone="success">{state.message}</Alert>}
      <div className="flex flex-wrap gap-2">
        <SubmitButton name="decision" value="approved" pendingLabel="…" className="min-h-12 flex-1">
          اعتمد ✓
        </SubmitButton>
        <SubmitButton name="decision" value="rejected" variant="secondary" pendingLabel="…" className="min-h-12 flex-1">
          ارفض وأعد بملاحظتي
        </SubmitButton>
      </div>
    </form>
  );
}

export function AddRuleForm({ paths }: { paths: { id: string; title: string }[] }) {
  const [state, action] = useActionState<AdminFormState, FormData>(addRule, {});
  return (
    <form action={action} className="flex flex-col gap-2">
      <Textarea name="text" rows={2} maxLength={1000} placeholder="قاعدة دائمة للوكيل، مثل: لا تستخدم أسماء أجنبية في القصص." />
      <div className="flex gap-2">
        <Select name="path_id" defaultValue="" className="flex-1">
          <option value="">لكل المسارات</option>
          {paths.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </Select>
        <SubmitButton pendingLabel="…" variant="secondary">
          أضف القاعدة
        </SubmitButton>
      </div>
      {state.error && <Alert tone="error">{state.error}</Alert>}
    </form>
  );
}

/** Refreshes the page every 10 seconds while the agent is working. */
export function AutoRefresh({ active }: { active: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => router.refresh(), 10_000);
    return () => clearInterval(t);
  }, [active, router]);
  return null;
}
