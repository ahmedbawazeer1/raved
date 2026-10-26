"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";

export interface WaitlistState {
  ok?: boolean;
  error?: string;
}

/** «أبلغني عند الإطلاق»: logged-in students join by account, visitors by email. */
export async function joinWaitlist(_prev: WaitlistState, formData: FormData): Promise<WaitlistState> {
  const pathId = z.uuid().safeParse(formData.get("path_id"));
  if (!pathId.success) return { error: "حدث خطأ. حدّث الصفحة وحاول مرة أخرى." };

  const ctx = await getSessionContext();
  const supabase = await createClient();

  let row: { path_id: string; student_id?: string; email?: string };
  if (ctx) {
    row = { path_id: pathId.data, student_id: ctx.userId };
  } else {
    const email = z.email().trim().toLowerCase().safeParse(formData.get("email"));
    if (!email.success) return { error: "اكتب بريداً إلكترونياً صحيحاً." };
    row = { path_id: pathId.data, email: email.data };
  }

  const { error } = await supabase.from("path_waitlist").insert(row);
  // 23505 = already on the list: same happy answer.
  if (error && error.code !== "23505") return { error: "تعذر التسجيل الآن. حاول مرة أخرى." };
  return { ok: true };
}
