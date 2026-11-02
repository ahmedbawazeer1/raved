import "server-only";
import { getSupabasePublicEnv, isSupabaseConfigured } from "@/lib/supabase/env";

/** Whether Google sign-in is switched on in Supabase (checked every 5 minutes), so we never show a broken button. */
export async function isGoogleAuthEnabled(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const { url, publishableKey } = getSupabasePublicEnv();
    // The query string gives this check its own cache entry (the older one was kept for an hour).
    const res = await fetch(`${url}/auth/v1/settings?check=google`, {
      headers: { apikey: publishableKey },
      next: { revalidate: 300 },
    });
    if (!res.ok) return false;
    const settings = (await res.json()) as { external?: { google?: boolean } };
    return settings.external?.google === true;
  } catch {
    return false;
  }
}
