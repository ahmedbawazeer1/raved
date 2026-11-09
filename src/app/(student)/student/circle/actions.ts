"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { CIRCLE_NAMES } from "@shared/gamification/league";
import { requireActiveStudent } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export interface CircleState {
  error?: string;
}

function message(e: string): string {
  if (e.includes("not_found")) return "لم نجد حلقة بهذا الرمز. تأكد منه واطلبه من صديقك.";
  if (e.includes("circle_full")) return "هذه الحلقة ممتلئة (١٠ أعضاء).";
  if (e.includes("already_in_circle")) return "أنت في حلقة الآن. اخرج منها أولاً.";
  return "حدث خطأ. حاول مرة أخرى.";
}

export async function createCircle(_prev: CircleState, formData: FormData): Promise<CircleState> {
  await requireActiveStudent();
  const name = z.enum(CIRCLE_NAMES).safeParse(formData.get("name"));
  if (!name.success) return { error: "اختر اسماً للحلقة." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_circle", { p_name: name.data });
  if (error) return { error: message(error.message) };
  revalidatePath("/student/circle");
  return {};
}

export async function joinCircle(_prev: CircleState, formData: FormData): Promise<CircleState> {
  await requireActiveStudent();
  const code = z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9]{6}$/)
    .safeParse(formData.get("code"));
  if (!code.success) return { error: "الرمز ٦ حروف وأرقام." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("join_circle", { p_code: code.data });
  if (error) return { error: message(error.message) };
  revalidatePath("/student/circle");
  return {};
}

export async function leaveCircle(): Promise<void> {
  await requireActiveStudent();
  const supabase = await createClient();
  await supabase.rpc("leave_circle");
  revalidatePath("/student/circle");
}
