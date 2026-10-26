"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { dbErrorMessage } from "@/lib/auth/errors";
import {
  fieldErrors,
  sanitizeStep1Draft,
  sanitizeStep2Draft,
  step1Schema,
  step2Schema,
  type Step1Input,
  type Step2Input,
} from "@/lib/apply/schemas";
import { RECOMMENDATION_MAX_BYTES } from "@/lib/apply/options";

export interface ApplyFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

async function requireUser() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/login?next=/apply");
  return ctx;
}

async function ensureApplication(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("applications").select("id, status").eq("student_id", userId).maybeSingle();
  if (data) return data;
  const { data: created, error } = await supabase
    .from("applications")
    .insert({ student_id: userId })
    .select("id, status")
    .single();
  if (error) throw new Error(error.message);
  return created;
}

const EDITABLE = ["draft", "needs_changes"];

/** Autosave for step 1: stores whatever is valid so far. */
export async function saveStep1Draft(input: Partial<Record<keyof Step1Input, unknown>>): Promise<{ ok: boolean }> {
  const ctx = await getSessionContext();
  if (!ctx) return { ok: false };
  const draft = sanitizeStep1Draft(input);
  if (Object.keys(draft).length === 0) return { ok: true };
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update(draft).eq("id", ctx.userId);
  return { ok: !error };
}

export async function completeStep1(_prev: ApplyFormState, formData: FormData): Promise<ApplyFormState> {
  const ctx = await requireUser();
  const parsed = step1Schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), error: "راجع الحقول المظللة." };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", ctx.userId);
  if (error) return { error: "تعذر الحفظ. تحقق من الاتصال وحاول مرة أخرى." };

  const app = await ensureApplication(ctx.userId);
  redirect(EDITABLE.includes(app.status) ? "/apply/goal" : "/apply/status");
}

/** Autosave for step 2 (goal fields). */
export async function saveStep2Draft(input: Partial<Record<keyof Step2Input, unknown>>): Promise<{ ok: boolean }> {
  const ctx = await getSessionContext();
  if (!ctx) return { ok: false };
  const draft = sanitizeStep2Draft(input);
  if (Object.keys(draft).length === 0) return { ok: true };
  const supabase = await createClient();
  const { error } = await supabase
    .from("applications")
    .update(draft)
    .eq("student_id", ctx.userId)
    .in("status", EDITABLE);
  return { ok: !error };
}

/** Attaches an uploaded recommendation file (already in Storage under the student's folder). */
export async function attachRecommendation(file: {
  path: string;
  name: string;
  size: number;
}): Promise<{ ok: boolean; error?: string; previousPath?: string | null }> {
  const ctx = await getSessionContext();
  if (!ctx) return { ok: false, error: "انتهت جلستك. سجّل الدخول مرة أخرى." };
  if (!file.path.startsWith(`${ctx.userId}/`) || file.size > RECOMMENDATION_MAX_BYTES) {
    return { ok: false, error: "ملف التوصية غير صالح. ارفعه مرة أخرى." };
  }
  const app = await ensureApplication(ctx.userId);
  if (!EDITABLE.includes(app.status)) return { ok: false, error: "طلبك أُرسل ولا يمكن تعديله الآن." };

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("applications")
    .select("recommendation_path")
    .eq("student_id", ctx.userId)
    .single();
  const { error } = await supabase
    .from("applications")
    .update({ recommendation_path: file.path, recommendation_name: file.name.slice(0, 200), recommendation_size: file.size })
    .eq("student_id", ctx.userId);
  if (error) return { ok: false, error: dbErrorMessage(error) };
  return { ok: true, previousPath: current?.recommendation_path ?? null };
}

export async function submitApplication(_prev: ApplyFormState, formData: FormData): Promise<ApplyFormState> {
  const ctx = await requireUser();
  const parsed = step2Schema.safeParse({
    path_id: formData.get("path_id") ?? undefined,
    target_exam: formData.get("target_exam") ?? undefined,
    target_date: formData.get("target_date") ?? undefined,
    daily_minutes: formData.get("daily_minutes") ?? undefined,
    motivation: formData.get("motivation") ?? undefined,
  });
  const errors: Record<string, string> = parsed.success ? {} : fieldErrors(parsed.error);
  const guardian = formData.get("guardian_consent") === "on";
  const privacy = formData.get("privacy_consent") === "on";
  if (!guardian) errors.guardian_consent = "يلزم أن يعلم ولي أمرك ويوافق.";
  if (!privacy) errors.privacy_consent = "يلزم الموافقة على سياسة الخصوصية والشروط.";
  if (!parsed.success || Object.keys(errors).length > 0) {
    return { fieldErrors: errors, error: "راجع الحقول المظللة." };
  }

  const supabase = await createClient();
  const { error: updateError } = await supabase
    .from("applications")
    .update(parsed.data)
    .eq("student_id", ctx.userId)
    .in("status", EDITABLE);
  if (updateError) return { error: dbErrorMessage(updateError) };

  const { data: status, error } = await supabase.rpc("submit_application", {
    p_guardian_consent: guardian,
    p_privacy_consent: privacy,
  });
  if (error) return { error: dbErrorMessage(error) };

  redirect(status === "approved" ? "/student" : "/apply/status");
}
