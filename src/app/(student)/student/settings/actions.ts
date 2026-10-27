"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { step1Schema } from "@/lib/apply/schemas";
import { DAILY_MINUTES } from "@/lib/apply/options";
import { requireActiveStudent } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export interface SettingsState {
  ok?: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
}

const studySchema = z.object({
  daily_goal_minutes: z.coerce
    .number()
    .refine((n) => (DAILY_MINUTES as readonly number[]).includes(n), "اختر عدد الدقائق"),
});

export async function saveStudySettings(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const { userId } = await requireActiveStudent();
  const parsed = studySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "اختر عدد الدقائق اليومية." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ daily_goal_minutes: parsed.data.daily_goal_minutes, data_saver: formData.get("data_saver") === "on" })
    .eq("id", userId);
  if (error) return { error: "تعذر الحفظ. حاول مرة أخرى." };
  revalidatePath("/student", "layout");
  return { ok: true, message: "حُفظ." };
}

const profileSchema = step1Schema.pick({ full_name: true, school: true, city: true, grade: true, stream: true, phone: true, governorate: true });

export async function saveProfile(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const { userId } = await requireActiveStudent();
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { error: "تحقق من الحقول المعلّمة.", fieldErrors };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", userId);
  if (error) return { error: "تعذر الحفظ. حاول مرة أخرى." };
  revalidatePath("/student", "layout");
  return { ok: true, message: "حُفظت بياناتك." };
}

export async function changePassword(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  await requireActiveStudent();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8) return { error: "كلمة المرور 8 أحرف على الأقل." };
  if (password.length > 72) return { error: "كلمة المرور طويلة جداً." };
  if (password !== confirm) return { error: "كلمتا المرور غير متطابقتين." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "تعذر تغيير كلمة المرور. سجّل الدخول من جديد وحاول مرة أخرى." };
  return { ok: true, message: "تغيّرت كلمة المرور." };
}

/**
 * Deletes the account and personal data now (PRD SET-01: within 30 days). Rows owned by the
 * student cascade from auth.users → profiles; the recommendation file is removed from Storage.
 */
export async function deleteAccount(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const { userId } = await requireActiveStudent();
  if (String(formData.get("confirm") ?? "").trim() !== "احذف حسابي") return { error: "اكتب «احذف حسابي» للتأكيد." };

  const admin = createAdminClient();
  const { data: app } = await admin.from("applications").select("recommendation_path").eq("student_id", userId).maybeSingle();
  if (app?.recommendation_path) await admin.storage.from("recommendations").remove([app.recommendation_path]);
  await admin.from("audit_log").insert({ actor_id: null, action: "account.delete", target: userId, data: {} });
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { error: "تعذر حذف الحساب. حاول مرة أخرى أو تواصل مع فريق رفد." };

  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/?deleted=1");
}
