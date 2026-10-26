import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/db";
import { getSupabasePublicEnv } from "./env";

/** Supabase client for Server Components, Route Handlers and Server Actions. Respects RLS as the signed-in user. */
export async function createClient() {
  // Read cookies first: it marks the page as per-request (never prerendered at build time).
  const cookieStore = await cookies();
  const { url, publishableKey } = getSupabasePublicEnv();

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // The session refresh in the proxy handles writing them.
        }
      },
    },
  });
}

/** Cookie-less client for public, cacheable reads (anon role, RLS applies). */
export function createPublicClient() {
  const { url, publishableKey } = getSupabasePublicEnv();
  return createSupabaseClient<Database>(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
