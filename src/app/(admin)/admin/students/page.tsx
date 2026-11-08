import type { Metadata } from "next";
import Link from "next/link";
import { Download, Search, Users } from "lucide-react";
import { Empty, PageHead, Panel } from "@/components/console/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

  const tone = (st: string) => (st === "active" ? "success" : st === "suspended" ? "destructive" : "muted") as "success" | "destructive" | "muted";
  return (
    <div className="flex flex-col gap-5">
      <PageHead title="الطلاب" sub={`${students.length} طالباً بهذه المواصفات · اضغط أي طالب لترى تقدّمه`}>
        <Button asChild variant="secondary">
          <a href={`/admin/students/export${exportQuery ? `?${exportQuery}` : ""}`} download>
            <Download className="size-4" aria-hidden="true" />
            تصدير CSV
          </a>
        </Button>
      </PageHead>
      <form className="grid gap-2 rounded-[18px] border border-border bg-card p-3 md:grid-cols-[2fr_1fr_1fr_1fr_auto]">
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
        <Button type="submit">
          <Search className="size-4" aria-hidden="true" /> تصفية
        </Button>
      </form>

      {students.length === 0 ? (
        <Panel>
          <Empty icon={Users} tone="blue" title="لا يوجد طلاب بهذه المواصفات">
            غيّر التصفية، أو انتظر حتى تقبل طلبات التحاق جديدة.
          </Empty>
        </Panel>
      ) : (
        <ul className="flex flex-col overflow-hidden rounded-[18px] border border-border bg-card">
          {students.map((s) => (
            <li key={s.id} className="border-b border-border last:border-b-0">
              <Link
                href={`/admin/students/${s.id}`}
                className="grid grid-cols-[44px_1fr_auto] items-center gap-3 px-4 py-3 text-foreground no-underline hover:bg-muted hover:text-foreground md:grid-cols-[44px_minmax(0,2fr)_1fr_1fr_80px_110px_96px]"
              >
                <span className="flex size-11 items-center justify-center rounded-xl bg-primary-tint font-bold text-primary">
                  {(s.full_name || "؟").charAt(0)}
                </span>
                <span className="min-w-0">
                  <b className="block truncate">{s.full_name || "—"}</b>
                  <En as="span" className="block truncate text-xs text-muted-foreground">
                    {s.email}
                  </En>
                </span>
                <span className="hidden text-sm md:block">{(s.governorate && gov.get(s.governorate)) || "—"}</span>
                <span className="hidden text-sm md:block">{gradeLabel(s.grade)}</span>
                <span className="hidden md:block">
                  <En className="rounded-lg bg-muted px-2 py-0.5 text-sm font-semibold">{s.level ?? "—"}</En>
                </span>
                <span>
                  <Badge tone={tone(s.status)}>{STUDENT_STATUS_AR[s.status] ?? s.status}</Badge>
                </span>
                <span className="hidden text-sm text-muted-foreground md:block">{new Date(s.created_at).toLocaleDateString("ar")}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">أرقام الهواتف لا تظهر في القائمة ولا في ملف التصدير. تظهر في ملف الطالب عند الضغط، ويُسجَّل ذلك.</p>
    </div>
  );
}
