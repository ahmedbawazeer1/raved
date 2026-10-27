import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { En } from "@/components/en";
import { MixedText } from "@/components/mixed-text";
import { daysAgoIso, dropOffLessons, weeklyActive } from "@/lib/admin/reports";
import { createClient } from "@/lib/supabase/server";
import { resolveReport } from "../actions";

export const metadata: Metadata = { title: "التقارير والبلاغات" };

const KIND_AR: Record<string, string> = { error: "خطأ في الدرس", not_useful: "غير مفيد", broken_link: "رابط معطّل" };

export default async function ReportsPage() {
  const supabase = await createClient();
  const since = daysAgoIso(8 * 7);
  const [{ data: progress }, { data: quizzes }, { data: students }, { data: governorates }, { data: reports }, { data: lessons }, { data: allProgress }, { data: broken }] =
    await Promise.all([
      supabase.from("lesson_progress").select("student_id, completed_at").gte("completed_at", since),
      supabase.from("quiz_attempts").select("student_id, created_at").gte("created_at", since),
      supabase.from("profiles").select("governorate").eq("role", "student").eq("status", "active"),
      supabase.from("governorates").select("code, name_ar"),
      supabase.from("reports").select("id, kind, note, created_at, lessons(id, title)").eq("status", "open").order("created_at", { ascending: false }).limit(50),
      supabase.from("lessons").select("id, title, position, units!inner(position, status, levels!inner(position))").eq("units.status", "published").eq("archived", false),
      supabase.from("lesson_progress").select("student_id, lesson_id").eq("status", "completed"),
      supabase.from("sources").select("youtube_id, title, last_checked_at").eq("status", "broken").order("last_checked_at", { ascending: false }),
    ]);

  const weeks = weeklyActive(
    [...(progress ?? []).map((p) => ({ student: p.student_id, at: p.completed_at })), ...(quizzes ?? []).map((q) => ({ student: q.student_id, at: q.created_at }))],
    8,
    new Date(),
  );
  const maxWeek = Math.max(1, ...weeks.map((w) => w.students));

  const gov = new Map((governorates ?? []).map((g) => [g.code, g.name_ar]));
  const byGov = new Map<string, number>();
  for (const s of students ?? []) {
    const name = (s.governorate && gov.get(s.governorate)) || "لم يحدد";
    byGov.set(name, (byGov.get(name) ?? 0) + 1);
  }

  const ordered = (lessons ?? [])
    .sort((a, b) => a.units.levels.position - b.units.levels.position || a.units.position - b.units.position || a.position - b.position)
    .map((l) => ({ id: l.id, title: l.title }));
  const completions = new Map<string, Set<string>>();
  for (const p of allProgress ?? []) {
    if (!completions.has(p.lesson_id)) completions.set(p.lesson_id, new Set());
    completions.get(p.lesson_id)!.add(p.student_id);
  }
  const drops = dropOffLessons(ordered, completions);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-[28px] font-bold">التقارير والبلاغات</h1>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 text-lg font-bold">الطلاب النشطون أسبوعياً</h2>
          <div className="flex h-40 items-end gap-2" dir="ltr">
            {weeks.map((w) => (
              <div key={w.week} className="flex flex-1 flex-col items-center gap-1">
                <span className="font-en text-xs font-semibold">{w.students}</span>
                <span className="w-full rounded-t-md bg-primary" style={{ height: `${Math.max(4, (w.students / maxWeek) * 110)}px` }} />
                <span className="font-en text-[10px] text-muted-foreground">{w.week.slice(5)}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">طالب نشط = أكمل درساً أو اختباراً في ذلك الأسبوع (يبدأ الأسبوع السبت).</p>
        </Card>

        <Card className="p-5">
          <h2 className="mb-2 text-lg font-bold">الطلاب النشطون حسب المحافظة</h2>
          {byGov.size === 0 ? (
            <p className="text-sm text-muted-foreground">لا يوجد طلاب نشطون بعد.</p>
          ) : (
            [...byGov.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([name, n]) => (
                <div key={name} className="flex items-center justify-between border-b border-muted py-2 text-[15px] last:border-b-0">
                  <span>{name}</span>
                  <span className="font-en font-semibold">{n}</span>
                </div>
              ))
          )}
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="mb-2 text-lg font-bold">أين يتوقف الطلاب؟</h2>
        {drops.length === 0 ? (
          <p className="text-sm text-muted-foreground">لا توجد بيانات كافية بعد.</p>
        ) : (
          drops.map((d) => (
            <div key={d.lessonId} className="flex items-center justify-between gap-3 border-b border-muted py-2 text-[15px] last:border-b-0">
              <MixedText text={d.title} />
              <span className="text-sm text-muted-foreground">
                وصله {d.reached} وأكمله {d.completed}
              </span>
            </div>
          ))
        )}
      </Card>

      <Card className="p-5">
        <h2 className="mb-2 text-lg font-bold">بلاغات مفتوحة</h2>
        {(reports ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">لا توجد بلاغات مفتوحة.</p>
        ) : (
          reports!.map((r) => (
            <div key={r.id} className="flex flex-wrap items-start gap-3 border-b border-muted py-3 text-sm last:border-b-0">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {KIND_AR[r.kind] ?? r.kind}
                  {r.lessons && (
                    <>
                      {" "}
                      · <Link href={`/preview/lesson/${r.lessons.id}`}>
                        <MixedText text={r.lessons.title} />
                      </Link>
                    </>
                  )}
                </p>
                {r.note && <p className="text-muted-foreground">{r.note}</p>}
                <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("ar")}</p>
              </div>
              <form action={resolveReport}>
                <input type="hidden" name="report_id" value={r.id} />
                <SubmitButton variant="secondary" size="sm" pendingLabel="…">
                  تمّت المعالجة
                </SubmitButton>
              </form>
            </div>
          ))
        )}
      </Card>

      <Card id="videos" className="p-5">
        <h2 className="mb-2 text-lg font-bold">روابط فيديو معطّلة</h2>
        <p className="mb-2 text-sm text-muted-foreground">تُفحص كل أسبوع تلقائياً. الدرس يعمل بدون الفيديو، لكن استبدل الرابط في ملف الوحدة.</p>
        {(broken ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">لا توجد روابط معطّلة.</p>
        ) : (
          broken!.map((b) => (
            <div key={b.youtube_id} className="flex items-center justify-between border-b border-muted py-2 text-sm last:border-b-0">
              <En>{b.youtube_id}</En>
              <span className="text-muted-foreground">{b.last_checked_at ? new Date(b.last_checked_at).toLocaleDateString("ar") : ""}</span>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
