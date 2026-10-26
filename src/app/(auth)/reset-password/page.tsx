import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/auth-forms";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "كلمة مرور جديدة" };

export default async function ResetPasswordPage() {
  await requireSession("/reset-password");
  return (
    <AuthShell>
      <div>
        <h1 className="text-[26px] font-bold">اختر كلمة مرور جديدة</h1>
        <p className="mt-1.5 text-[15px] text-muted-foreground">ستستخدمها في المرات القادمة لتسجيل الدخول.</p>
      </div>
      <ResetPasswordForm />
    </AuthShell>
  );
}
