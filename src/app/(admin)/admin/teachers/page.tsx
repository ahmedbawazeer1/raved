import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AddTeacherForm } from "@/components/admin/add-teacher-form";
import { createClient } from "@/lib/supabase/server";
import { removeTeacher } from "./actions";

export const metadata: Metadata = { title: "المعلمون" };

export default async function TeachersPage() {
  const supabase = await createClient();
  const { data: teachers } = await supabase.from("profiles").select("id, email, full_name, updated_at").eq("role", "teacher").order("full_name");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">المعلمون</h1>
        <p className="text-muted-foreground">
          المعلم يراجع المحتوى ويعدّله ويضيف قنوات الفيديو في{" "}
          <Link href="/studio" className="font-semibold">
            استوديو المحتوى
          </Link>
          . الاعتماد والنشر للطلاب يبقيان لك وحدك.
        </p>
      </header>

      <Card className="flex flex-col gap-4 p-5">
        <h2 className="text-lg font-semibold">إضافة معلم</h2>
        <p className="text-sm text-muted-foreground">
          يسجّل المعلم في المنصة أولاً بحساب عادي (بالبريد أو Google)، ثم تكتب بريده هنا. لا يحتاج أن يكمل طلب الالتحاق.
        </p>
        <AddTeacherForm />
      </Card>

      <Card className="flex flex-col gap-3 p-5">
        <h2 className="text-lg font-semibold">المعلمون الحاليون ({teachers?.length ?? 0})</h2>
        {!teachers?.length ? (
          <p className="text-muted-foreground">لا يوجد معلمون بعد.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {teachers.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-semibold">{t.full_name || "بدون اسم"}</p>
                  <p className="text-sm break-all text-muted-foreground" dir="ltr">
                    {t.email}
                  </p>
                </div>
                <form action={removeTeacher}>
                  <input type="hidden" name="email" value={t.email ?? ""} />
                  <Button type="submit" variant="destructive" size="sm">
                    إزالة الصلاحية
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
