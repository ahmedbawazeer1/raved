"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/db";
import { getSupabasePublicEnv } from "./env";

/** Supabase client for Client Components. Respects RLS as the signed-in user. */
export function createClient() {
  const { url, publishableKey } = getSupabasePublicEnv();
  return createBrowserClient<Database>(url, publishableKey);
}
