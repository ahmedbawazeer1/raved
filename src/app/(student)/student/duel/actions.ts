"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireActiveStudent } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export interface DuelState {
  error?: string;
}

/** Creates a duel from the words the student has learned and opens it. */
export async function createDuel(): Promise<DuelState> {
  await requireActiveStudent();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_duel");
  if (error || !data) {
    return { error: error?.message === "not_enough_words" ? "أكمل أول درس مفردات لتتحدى بكلماته." : "تعذر إنشاء التحدي. حاول مرة أخرى." };
  }
  redirect(`/student/duel/${data}`);
}

const code = z.string().trim().regex(/^[A-Za-z0-9]{6}$/);

/** Opens a friend's duel by its 6-character code. */
export async function joinDuel(_prev: DuelState, formData: FormData): Promise<DuelState> {
  await requireActiveStudent();
  const parsed = code.safeParse(formData.get("code"));
  if (!parsed.success) return { error: "الرمز 6 حروف وأرقام." };
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_duel", { p_code: parsed.data });
  if (!data) return { error: "لم نجد تحدياً بهذا الرمز." };
  redirect(`/student/duel/${parsed.data.toUpperCase()}`);
}

/** Answers of a duel, graded on the server. Returns the score. */
export async function submitDuel(duelCode: string, answers: Record<string, number>, timeMs: number): Promise<{ score?: number; error?: string }> {
  await requireActiveStudent();
  const parsed = code.safeParse(duelCode);
  if (!parsed.success) return { error: "رمز غير صالح." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_duel", { p_code: parsed.data, p_answers: answers, p_time_ms: Math.round(timeMs) });
  if (error) return { error: error.message === "already_played" ? "لعبت هذا التحدي من قبل." : "تعذر الحفظ. حاول مرة أخرى." };
  return { score: data ?? 0 };
}
