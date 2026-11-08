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
  const url = new URL(result.url);
  const code = url.searchParams.get("code");
  if (code) {
    const { error: e } = await supabase.auth.exchangeCodeForSession(code);
    return e ? "تعذر إكمال تسجيل Google. حاول مرة أخرى." : null;
  }
  // Implicit flow fallback: tokens in the fragment.
  const params = new URLSearchParams(url.hash.replace(/^#/, ""));
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");
  if (access_token && refresh_token) {
    const { error: e } = await supabase.auth.setSession({ access_token, refresh_token });
    return e ? "تعذر إكمال تسجيل Google. حاول مرة أخرى." : null;
  }
  return "تعذر إكمال تسجيل Google. حاول مرة أخرى.";
}
