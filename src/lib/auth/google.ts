import "server-only";
import { getSupabasePublicEnv, isSupabaseConfigured } from "@/lib/supabase/env";

/** Whether Google sign-in is switched on in Supabase (checked hourly), so we never show a broken button. */
export async function isGoogleAuthEnabled(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const { url, publishableKey } = getSupabasePublicEnv();
    const res = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: publishableKey },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return false;
    const settings = (await res.json()) as { external?: { google?: boolean } };
    return settings.external?.google === true;
  } catch {
    return false;
  }
}
