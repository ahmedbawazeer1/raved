import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { SUPABASE_KEY, SUPABASE_URL } from "@/config";
import { supabase } from "./supabase";

/** Google sign-in is shown only when it is turned on in Supabase (same check as the website). */
export async function googleEnabled(): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_KEY } });
    const s = (await res.json()) as { external?: { google?: boolean } };
    return s.external?.google === true;
  } catch {
    return false;
  }
}

/**
 * Signs in with Google in the phone's browser and comes back to the app (raved://auth-callback).
 * Needs that address in Supabase → Authentication → URL Configuration → Redirect URLs.
 */
export async function signInWithGoogle(): Promise<string | null> {
  const redirectTo = Linking.createURL("auth-callback");
  const { data, error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo, skipBrowserRedirect: true } });
  if (error || !data.url) return "تعذر فتح تسجيل Google. حاول مرة أخرى.";
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== "success") return null; // cancelled
  return finishGoogle(result.url);
}

const FAILED = "تعذر إكمال تسجيل Google. حاول مرة أخرى.";
const pending = new Map<string, Promise<string | null>>();

/**
 * Finishes Google sign-in from the address Google returns to (raved://auth-callback?code=…). Android may
 * deliver that address both to the sign-in window and to the app's router (the auth-callback screen),
 * so the same code is exchanged once and both callers share the result.
 */
export function finishGoogle(returned: string): Promise<string | null> {
  const key = returned.split("#")[0];
  let job = pending.get(key);
  if (!job) {
    job = exchange(returned);
    pending.set(key, job);
  }
  return job;
}

async function exchange(returned: string): Promise<string | null> {
  const query = returned.includes("?") ? returned.slice(returned.indexOf("?") + 1).split("#")[0] : "";
  const hash = returned.includes("#") ? returned.slice(returned.indexOf("#") + 1) : "";
  const code = new URLSearchParams(query).get("code");
  if (code) {
    const { error: e } = await supabase.auth.exchangeCodeForSession(code);
    if (!e) return null;
    // Already exchanged by the other caller: fine if we now have a session.
    const { data } = await supabase.auth.getSession();
    return data.session ? null : FAILED;
  }
  // Implicit flow fallback: tokens in the fragment.
  const params = new URLSearchParams(hash);
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");
  if (access_token && refresh_token) {
    const { error: e } = await supabase.auth.setSession({ access_token, refresh_token });
    return e ? FAILED : null;
  }
  return FAILED;
}
