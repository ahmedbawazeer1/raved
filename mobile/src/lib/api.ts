import { WEB_URL } from "@/config";
import { supabase } from "./supabase";

/**
 * Calls the website's app API (src/app/api/app/*) as the signed-in student. The server runs the same
 * code as the website (limits, redaction, logging); AI keys never reach the phone.
 */
export async function appApi<T>(path: string, body: unknown): Promise<T & { error?: string }> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { error: "سجّل الدخول من جديد." } as T & { error?: string };
  try {
    const res = await fetch(`${WEB_URL}/api/app/${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
    return (await res.json()) as T & { error?: string };
  } catch {
    return { error: "تعذر الاتصال. تأكد من الإنترنت وحاول مرة أخرى." } as T & { error?: string };
  }
}

/** Uploads a recording for speech-to-text (sent once, never stored). */
export async function transcribe(uri: string): Promise<{ text?: string; error?: string }> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { error: "سجّل الدخول من جديد." };
  const form = new FormData();
  form.append("audio", { uri, name: "speech.m4a", type: "audio/m4a" } as unknown as Blob);
  try {
    const res = await fetch(`${WEB_URL}/api/app/transcribe`, { method: "POST", headers: { authorization: `Bearer ${token}` }, body: form });
    return (await res.json()) as { text?: string; error?: string };
  } catch {
    return { error: "تعذر الاتصال. تأكد من الإنترنت وحاول مرة أخرى." };
  }
}
