import type { Metadata } from "next";
import Link from "next/link";
import { Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/form";
import { En } from "@/components/en";
import { listStudents, parseStudentFilters, STUDENT_STATUS_AR } from "@/lib/admin/students";
import { createClient } from "@/lib/supabase/server";
import { gradeLabel } from "@/lib/yemen";

export const metadata: Metadata = { title: "الطلاب" };

export default async function StudentsPage(props: PageProps<"/admin/students">) {
  const filters = parseStudentFilters(await props.searchParams);
  const supabase = await createClient();
  const [students, { data: governorates }] = await Promise.all([
    listStudents(filters),
    supabase.from("governorates").select("code, name_ar").order("position"),
  ]);
  const gov = new Map((governorates ?? []).map((g) => [g.code, g.name_ar]));
  const exportQuery = new URLSearchParams(Object.entries(filters).filter(([, v]) => v) as [string, string][]).toString();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[28px] font-bold">الطلاب</h1>
        <Button asChild variant="secondary">
          <a href={`/admin/students/export${exportQuery ? `?${exportQuery}` : ""}`} download>
            <Download className="size-4" aria-hidden="true" />
            تصدير CSV
          </a>
        </Button>
      </div>
      <form className="grid gap-2 md:grid-cols-[2fr_1fr_1fr_1fr_auto]">
        <label className="sr-only" htmlFor="q">
          بحث
        </label>
        <Input id="q" name="q" placeholder="ابحث بالاسم أو البريد" defaultValue={filters.q} />
        <Select name="governorate" defaultValue={filters.governorate ?? ""} aria-label="المحافظة">
          <option value="">كل المحافظات</option>
          {(governorates ?? []).map((g) => (
            <option key={g.code} value={g.code}>
              {g.name_ar}
            </option>
          ))}
        </Select>
        <Select name="level" defaultValue={filters.level ?? ""} aria-label="المستوى">
          <option value="">كل المستويات</option>
          {["A1", "A2", "B1", "B2"].map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
          <option value="none">لم يحدد</option>
        </Select>
        <Select name="status" defaultValue={filters.status ?? ""} aria-label="الحالة">
          <option value="">كل الحالات</option>
          {Object.entries(STUDENT_STATUS_AR).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>
        <Button type="submit">تصفية</Button>
      </form>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-background text-muted-foreground">
            <tr>
              <th className="px-3 py-2.5 text-start font-semibold">الطالب</th>
              <th className="px-3 py-2.5 text-start font-semibold">المحافظة</th>
              <th className="px-3 py-2.5 text-start font-semibold">الصف</th>
              <th className="px-3 py-2.5 text-start font-semibold">المستوى</th>
              <th className="px-3 py-2.5 text-start font-semibold">الحالة</th>
              <th className="px-3 py-2.5 text-start font-semibold">انضم</th>
            </tr>
          </thead>
          <tbody>
            {students.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                  لا يوجد طلاب بهذه المواصفات.
                </td>
              </tr>
            )}
            {students.map((s) => (
              <tr key={s.id} className="border-t border-muted">
                <td className="px-3 py-2.5">
                  <Link href={`/admin/students/${s.id}`} className="font-semibold">
                    {s.full_name || "—"}
                  </Link>
                  <En as="p" className="text-xs text-muted-foreground">
                    {s.email}
                  </En>
                </td>
                <td className="px-3 py-2.5">{(s.governorate && gov.get(s.governorate)) || "—"}</td>
                <td className="px-3 py-2.5">{gradeLabel(s.grade)}</td>
                <td className="px-3 py-2.5">
                  <En>{s.level ?? "—"}</En>
                </td>
                <td className="px-3 py-2.5">
                  <Badge tone={s.status === "active" ? "success" : s.status === "suspended" ? "destructive" : "muted"}>{STUDENT_STATUS_AR[s.status] ?? s.status}</Badge>
                </td>
                <td className="px-3 py-2.5 text-muted-foreground">{new Date(s.created_at).toLocaleDateString("ar")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <p className="text-xs text-muted-foreground">أرقام الهواتف لا تظهر في القائمة ولا في ملف التصدير. تظهر في ملف الطالب عند الضغط، ويُسجَّل ذلك.</p>
    </div>
  );
}
