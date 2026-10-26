import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "استعادة كلمة المرور" };

export default function ForgotPage() {
  return (
    <AuthShell>
      <div>
        <h1 className="text-[26px] font-bold">نسيت كلمة المرور؟</h1>
        <p className="mt-1.5 text-[15px] text-muted-foreground">اكتب بريدك ونرسل لك رابطاً لتعيينها من جديد.</p>
      </div>
      <ForgotForm />
      <Link href="/login" className="text-center text-sm">
        العودة لتسجيل الدخول
      </Link>
    </AuthShell>
  );
}
