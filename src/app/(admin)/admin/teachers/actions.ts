"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { AdminFormState } from "../actions";

const MESSAGES: Record<string, string> = {
  no_account: "لا يوجد حساب بهذا البريد. اطلب من المعلم أن يسجّل في المنصة أولاً بنفس البريد، ثم أضفه.",
  is_admin: "هذا حساب المدير، ولا يمكن تغييره.",
  admins_only: "هذه العملية للمدير فقط.",
};

function explain(message: string): string {
  const key = Object.keys(MESSAGES).find((k) => message.includes(k));
  return key ? MESSAGES[key] : "تعذر الحفظ. حاول مرة أخرى.";
}

/** Gives an existing account the teacher role (content studio access). */
export async function addTeacher(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireAdmin();
  const email = z.string().trim().email().safeParse(formData.get("email"));
  if (!email.success) return { error: "اكتب بريداً إلكترونياً صحيحاً." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_teacher", { p_email: email.data, p_teacher: true });
  if (error) return { error: explain(error.message) };
  revalidatePath("/admin/teachers");
  return { ok: true, message: `أصبح ${email.data} معلماً. يدخل بحسابه فيفتح له «استوديو المحتوى».` };
}

/** Takes the teacher role back (the account becomes a normal student account). */
export async function removeTeacher(formData: FormData): Promise<void> {
  await requireAdmin();
  const email = z.string().trim().email().safeParse(formData.get("email"));
  if (!email.success) return;
  const supabase = await createClient();
  await supabase.rpc("set_teacher", { p_email: email.data, p_teacher: false });
  revalidatePath("/admin/teachers");
}
