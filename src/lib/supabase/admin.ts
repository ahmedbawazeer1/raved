import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSupabasePublicEnv } from "./env";

/**
 * Supabase client with the secret key. BYPASSES RLS.
 * Server code only, and only for trusted admin/system tasks after checking the caller's role.
 */
export function createAdminClient() {
  const { url } = getSupabasePublicEnv();
  // The Supabase ↔ Vercel integration may set the legacy SERVICE_ROLE_KEY name instead.
  const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secretKey) {
    throw new Error("Supabase is not configured: SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) is missing");
  }
  return createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
