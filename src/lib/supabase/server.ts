import "server-only";
import { cookies, headers } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/db";
import { getSupabasePublicEnv } from "./env";

/**
 * The mobile app signs requests with "Authorization: Bearer <access token>" (no cookies). Returns the
 * token when present, so the same server code serves the website and the app as the same user.
 */
export async function bearerToken(): Promise<string | null> {
  try {
    const auth = (await headers()).get("authorization");
    return auth?.startsWith("Bearer ") ? auth.slice(7).trim() || null : null;
  } catch {
    return null; // outside a request (build time)
  }
}

/** Supabase client for Server Components, Route Handlers and Server Actions. Respects RLS as the signed-in user. */
export async function createClient() {
  const token = await bearerToken();
  if (token) {
    const { url, publishableKey } = getSupabasePublicEnv();
    return createSupabaseClient<Database>(url, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
  }
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
