"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { authErrorMessage } from "@/lib/auth/errors";
import { homePathFor, pickDestination, safeNextPath } from "@/lib/auth/routing";
import { getOrigin } from "@/lib/site-url";

export interface AuthFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  sent?: boolean;
  email?: string;
}

const emailSchema = z.email({ error: "اكتب بريداً إلكترونياً صحيحاً" }).trim().toLowerCase();
const passwordSchema = z.string().min(8, "8 أحرف على الأقل").max(72, "كلمة المرور طويلة جداً");

async function destinationAfterLogin(userId: string, next: string | null): Promise<string> {
  const supabase = await createClient();
  const [{ data: profile }, { data: application }] = await Promise.all([
    supabase.from("profiles").select("role, status, birth_date, phone, school").eq("id", userId).maybeSingle(),
    supabase.from("applications").select("status").eq("student_id", userId).maybeSingle(),
  ]);
  return pickDestination(homePathFor(profile, application), next);
}

export async function login(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = emailSchema.safeParse(formData.get("email"));
  const password = String(formData.get("password") ?? "");
  if (!email.success || !password) {
    return { fieldErrors: { email: email.success ? "" : "اكتب بريداً إلكترونياً صحيحاً", password: password ? "" : "اكتب كلمة المرور" } };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.data, password });
  if (error || !data.user) return { error: authErrorMessage(error), email: email.data };

  redirect(await destinationAfterLogin(data.user.id, formData.get("next")?.toString() ?? null));
}

const signupSchema = z.object({
  full_name: z.string().trim().min(3, "اكتب اسمك الكامل").max(120, "الاسم طويل جداً"),
  email: emailSchema,
  password: passwordSchema,
});

export async function signup(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = signupSchema.safeParse({
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { fieldErrors };
  }

  const supabase = await createClient();
  const origin = await getOrigin();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.full_name },
      emailRedirectTo: `${origin}/auth/callback?next=/apply`,
    },
  });
  if (error) return { error: authErrorMessage(error) };

  // Email confirmation off → already signed in.
  if (data.session) redirect("/apply");
  return { sent: true, email: parsed.data.email };
}

export async function requestPasswordReset(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = emailSchema.safeParse(formData.get("email"));
  if (!email.success) return { fieldErrors: { email: "اكتب بريداً إلكترونياً صحيحاً" } };

  const supabase = await createClient();
  const origin = await getOrigin();
  const { error } = await supabase.auth.resetPasswordForEmail(email.data, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });
  // Same answer whether or not the account exists (privacy); only rate limits are reported.
  if (error && (error.status === 429 || error.code?.startsWith("over_"))) return { error: authErrorMessage(error) };
  return { sent: true, email: email.data };
}

export async function updatePassword(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const password = passwordSchema.safeParse(formData.get("password"));
  if (!password.success) return { fieldErrors: { password: password.error.issues[0].message } };
  if (formData.get("password") !== formData.get("confirm")) return { fieldErrors: { confirm: "كلمتا المرور غير متطابقتين" } };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.updateUser({ password: password.data });
  if (error || !data.user) return { error: authErrorMessage(error) };
  redirect(await destinationAfterLogin(data.user.id, null));
}

export async function signInWithGoogle(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const origin = await getOrigin();
  const next = safeNextPath(formData.get("next")?.toString(), "");
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ""}` },
  });
  if (error || !data.url) redirect("/login?error=google");
  redirect(data.url);
}
