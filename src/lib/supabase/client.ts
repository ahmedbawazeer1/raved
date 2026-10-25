"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicEnv } from "./env";

/** Supabase client for Client Components. Respects RLS as the signed-in user. */
export function createClient() {
  const { url, publishableKey } = getSupabasePublicEnv();
  return createBrowserClient(url, publishableKey);
}
