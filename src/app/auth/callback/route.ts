import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { homePathFor, pickDestination } from "@/lib/auth/routing";

/** Landing point for email confirmation, password reset and Google sign-in links. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next");

  const supabase = await createClient();
  let userId: string | undefined;

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) userId = data.user?.id;
  } else if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) userId = data.user?.id;
  }

  if (!userId) return NextResponse.redirect(`${origin}/login?error=link`);

  if (next === "/reset-password") return NextResponse.redirect(`${origin}/reset-password`);

  const [{ data: profile }, { data: application }] = await Promise.all([
    supabase.from("profiles").select("role, status, birth_date, phone, school").eq("id", userId).maybeSingle(),
    supabase.from("applications").select("status").eq("student_id", userId).maybeSingle(),
  ]);
  return NextResponse.redirect(`${origin}${pickDestination(homePathFor(profile, application), next)}`);
}
