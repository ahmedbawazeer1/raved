import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell, GoogleButton, OrDivider } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/auth-forms";
import { isGoogleAuthEnabled } from "@/lib/auth/google";
import { getSessionContext } from "@/lib/auth/session";
import { homePathFor } from "@/lib/auth/routing";

export const metadata: Metadata = { title: "إنشاء حساب" };

export default async function SignupPage() {
  const ctx = await getSessionContext();
  if (ctx) redirect(homePathFor(ctx.profile, ctx.application));
  const google = await isGoogleAuthEnabled();

  return (
    <AuthShell>
      <div>
        <h1 className="text-2xl font-bold">أنشئ حسابك</h1>
        <p className="mt-1 text-sm text-muted-foreground">دقيقتان، ثم تكمل بياناتك وتختبر مستواك.</p>
      </div>
      {google && (
        <>
          <GoogleButton />
          <OrDivider />
        </>
      )}
      <SignupForm />
      <p className="text-center text-sm text-muted-foreground">
        لديك حساب؟ <Link href="/login">سجّل الدخول</Link>
      </p>
    </AuthShell>
  );
}
