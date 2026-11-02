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
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-bold">ابدأ رحلتك مع رفد</h1>
        <p className="text-sm text-muted-foreground">مجاني بالكامل. خطوات قصيرة، ثم تبدأ أول محطة في رحلة حضرموت.</p>
        <ol className="grid grid-cols-4 gap-1.5 text-center text-[11px] font-semibold text-muted-foreground" aria-label="خطوات التسجيل">
          {["حسابك", "بياناتك", "هدفك", "مستواك"].map((label, i) => (
            <li key={label} className="flex flex-col items-center gap-1">
              <span
                className={`flex size-8 items-center justify-center rounded-full font-en text-sm font-bold ${i === 0 ? "bg-primary text-white" : "bg-muted text-subtle"}`}
              >
                {i + 1}
              </span>
              {label}
            </li>
          ))}
        </ol>
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
