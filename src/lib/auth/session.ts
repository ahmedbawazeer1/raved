import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { Tables } from "@/types/db";
import { homePathFor } from "./routing";

export type Profile = Tables<"profiles">;
export type Application = Tables<"applications">;

export interface SessionContext {
  userId: string;
  email: string | null;
  profile: Profile | null;
  application: Application | null;
}

/** The signed-in user with their profile and application (one query set per request). */
export const getSessionContext = cache(async (): Promise<SessionContext | null> => {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) return null;

  const [{ data: profile }, { data: application }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("applications").select("*").eq("student_id", userId).maybeSingle(),
  ]);

  return {
    userId,
    email: (claimsData?.claims?.email as string | undefined) ?? profile?.email ?? null,
    profile,
    application,
  };
});

export async function requireSession(next = "/"): Promise<SessionContext> {
  const ctx = await getSessionContext();
  if (!ctx) redirect(`/login?next=${encodeURIComponent(next)}`);
  return ctx;
}

export async function requireAdmin(): Promise<SessionContext & { profile: Profile }> {
  const ctx = await requireSession("/admin");
  if (ctx.profile?.role !== "admin" || ctx.profile.status === "suspended") {
    redirect(homePathFor(ctx.profile, ctx.application));
  }
  return ctx as SessionContext & { profile: Profile };
}

export async function requireActiveStudent(): Promise<SessionContext & { profile: Profile }> {
  const ctx = await requireSession("/student");
  if (!ctx.profile || ctx.profile.status !== "active") {
    redirect(homePathFor(ctx.profile, ctx.application));
  }
  return ctx as SessionContext & { profile: Profile };
}
