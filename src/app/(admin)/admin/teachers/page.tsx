import type { Metadata } from "next";
import Link from "next/link";
import { GraduationCap, UserPlus } from "lucide-react";
import { Empty, IconTile, PageHead, Panel } from "@/components/console/ui";
import { Button } from "@/components/ui/button";
import { AddTeacherForm } from "@/components/admin/add-teacher-form";
import { createClient } from "@/lib/supabase/server";
import { removeTeacher } from "./actions";

export const metadata: Metadata = { title: "المعلمون" };

export default async function TeachersPage() {
  const supabase = await createClient();
  const [{ data: teachers }, { data: units }, { data: maps }] = await Promise.all([
    supabase.from("profiles").select("id, email, full_name, updated_at").eq("role", "teacher").order("full_name"),
    supabase.from("curriculum_units").select("teacher_ok_by").not("teacher_ok_by", "is", null),
    supabase.from("curriculum_levels").select("teacher_ok_by").not("teacher_ok_by", "is", null),
  ]);
  const reviewed = (id: string) => (units ?? []).filter((u) => u.teacher_ok_by === id).length;
  const mapsReviewed = (id: string) => (maps ?? []).filter((m) => m.teacher_ok_by === id).length;

  return (
    <div className="flex flex-col gap-5">
      <PageHead
        title="المعلمون"
        sub={
          <>
            المعلم المتطوع يراجع الخرائط والوحدات ويعدّلها ويختار الفيديوهات في{" "}
            <Link href="/studio" className="font-semibold">
              الاستوديو
            </Link>
            . الاعتماد والنشر لك وحدك.
          </>
        }
      />

      <Panel className="flex flex-wrap items-start gap-3">
        <IconTile icon={UserPlus} tone="green" />
        <div className="min-w-[220px] flex-1">
          <b>أضف معلماً</b>
          <p className="mb-3 text-sm text-muted-foreground">
            يسجّل المعلم في رفد أولاً بحساب عادي (بالبريد أو Google)، ثم تكتب بريده هنا. لا يحتاج طلب التحاق.
          </p>
          <AddTeacherForm />
        </div>
      </Panel>

      {!teachers?.length ? (
        <Panel>
          <Empty icon={GraduationCap} tone="gold" title="لا معلمين بعد">
            المعلم المتطوع يراجع الوحدات قبل أن تنشرها. اطلب منه أن ينشئ حساباً في رفد، ثم أضف بريده في الأعلى.
          </Empty>
        </Panel>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {teachers.map((t) => (
            <li key={t.id} className="flex flex-col gap-3 rounded-[18px] border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <span className="flex size-12 flex-none items-center justify-center rounded-2xl bg-warning-tint text-lg font-bold text-warning">
                  {(t.full_name || "م").charAt(0)}
                </span>
                <div className="min-w-0">
                  <b className="block truncate">{t.full_name || "بدون اسم"}</b>
                  <p className="truncate text-sm text-muted-foreground" dir="ltr">
                    {t.email}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <span className="rounded-xl bg-muted p-2">
                  <b className="block font-en text-lg">{reviewed(t.id)}</b>
                  <span className="text-xs text-muted-foreground">وحدات راجعها</span>
                </span>
                <span className="rounded-xl bg-muted p-2">
                  <b className="block font-en text-lg">{mapsReviewed(t.id)}</b>
                  <span className="text-xs text-muted-foreground">خرائط راجعها</span>
                </span>
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
    </div>
  );
}
