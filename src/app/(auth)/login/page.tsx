import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell, GoogleButton, OrDivider } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/auth-forms";
import { isGoogleAuthEnabled } from "@/lib/auth/google";
import { getSessionContext } from "@/lib/auth/session";
import { homePathFor } from "@/lib/auth/routing";

export const metadata: Metadata = { title: "تسجيل الدخول" };

const NOTICES: Record<string, string> = {
  link: "الرابط غير صالح أو انتهت صلاحيته. سجّل الدخول، أو اطلب رابطاً جديداً.",
  google: "تعذر الدخول بحساب Google. جرّب البريد وكلمة المرور.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, error } = await searchParams;
  const ctx = await getSessionContext();
  if (ctx) redirect(homePathFor(ctx.profile, ctx.application));
  const google = await isGoogleAuthEnabled();
  const nextPath = typeof next === "string" ? next : undefined;

  return (
    <AuthShell>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[26px] font-bold">أهلاً بعودتك</h1>
        <p className="text-[15px] text-muted-foreground">سجّل دخولك لتكمل من حيث توقفت.</p>
      </div>
      {google && (
        <>
          <GoogleButton next={nextPath} />
          <OrDivider />
        </>
      )}
      <LoginForm next={nextPath} notice={typeof error === "string" ? NOTICES[error] : undefined} />
      <p className="text-center text-[15px] text-muted-foreground">
        ليس لديك حساب؟{" "}
        <Link href="/signup" className="font-semibold">
          أنشئ حساباً
        </Link>
      </p>
    </AuthShell>
  );
}
