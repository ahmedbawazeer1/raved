import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CloudOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { En } from "@/components/en";
import { MixedText } from "@/components/mixed-text";
import { RevealPhone, StudentStatusForm } from "@/components/admin/student-tools";
import { STUDENT_STATUS_AR } from "@/lib/admin/students";
import { targetDateLabel, targetExamLabel } from "@/lib/apply/options";
import { SKILL_LABELS_AR, type Skill } from "@/lib/placement/engine";
import { streakDays } from "@/lib/student/stats";
import { createClient } from "@/lib/supabase/server";
import { ageFrom, gradeLabel, maskPhone, streamLabel } from "@/lib/yemen";

export const metadata: Metadata = { title: "ملف طالب" };

const fmt = (d: string | null | undefined) => (d ? new Date(d).toLocaleString("ar", { dateStyle: "medium", timeStyle: "short" }) : "—");

export default async function StudentDetailPage(props: PageProps<"/admin/students/[id]">) {
  const { id } = await props.params;
  const supabase = await createClient();
  const { data: s } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, governorate, city, school, grade, stream, birth_date, status, role, created_at, daily_goal_minutes, governorates(name_ar)")
    .eq("id", id)
    .maybeSingle();
  if (!s || s.role !== "student") notFound();

  const [{ data: app }, { data: enrollments }, { data: lessons }, { data: quizzes }, { data: vocab }, { data: skills }, { data: speaking }, { data: writing }, { data: certs }] =
    await Promise.all([
      supabase.from("applications").select("status, target_exam, target_date, daily_minutes, motivation, guardian_consent_at, privacy_consent_at, submitted_at, reviewed_at").eq("student_id", id).maybeSingle(),
      supabase.from("enrollments").select("is_primary, paths(title), levels!enrollments_current_level_id_fkey(code)").eq("student_id", id),
      supabase.from("lesson_progress").select("completed_at, synced_at, lessons(title)").eq("student_id", id).eq("status", "completed").order("completed_at", { ascending: false }),
      supabase.from("quiz_attempts").select("created_at, score, passed, submitted_offline").eq("student_id", id).order("created_at", { ascending: false }),
      supabase.from("vocab_reviews").select("last_reviewed_at").eq("student_id", id),
      supabase.from("skill_estimates").select("skill, level").eq("student_id", id),
      supabase.from("speaking_attempts").select("created_at").eq("student_id", id),
      supabase.from("writing_submissions").select("created_at").eq("student_id", id),
      supabase.from("certificates").select("code, levels(code)").eq("student_id", id),
    ]);

  const activity = [
    ...(lessons ?? []).map((l) => ({ at: l.completed_at, text: `أكمل درس «${l.lessons?.title ?? ""}»`, offline: false })),
    ...(quizzes ?? []).map((q) => ({ at: q.created_at, text: `اختبار وحدة: ${q.score}% ${q.passed ? "(نجح)" : ""}`, offline: q.submitted_offline })),
  ]
    .filter((a) => a.at)
    .sort((a, b) => (b.at! > a.at! ? 1 : -1))
    .slice(0, 15);
  const streak = streakDays([
    ...(lessons ?? []).map((l) => l.completed_at),
    ...(quizzes ?? []).map((q) => q.created_at),
    ...(vocab ?? []).map((v) => v.last_reviewed_at),
    ...(speaking ?? []).map((x) => x.created_at),
    ...(writing ?? []).map((x) => x.created_at),
  ]);
  const kpis = [
    { label: "دروس مكتملة", value: (lessons ?? []).length },
    { label: "اختبارات ناجحة", value: (quizzes ?? []).filter((q) => q.passed).length },
    { label: "كلمات", value: (vocab ?? []).length },
    { label: "أيام متتالية", value: streak },
  ];

  return (
    <div className="flex flex-col gap-5">
      <Link href="/admin/students" className="flex items-center gap-1 text-sm">
        <ArrowRight className="size-4" aria-hidden="true" />
        الطلاب
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-[28px] font-bold">{s.full_name || "—"}</h1>
        <Badge tone={s.status === "active" ? "success" : s.status === "suspended" ? "destructive" : "muted"}>{STUDENT_STATUS_AR[s.status] ?? s.status}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="flex flex-col gap-1 p-4">
            <span className="text-sm text-muted-foreground">{k.label}</span>
            <span className="font-en text-2xl font-bold">{k.value}</span>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 text-lg font-bold">البيانات</h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[15px]">
            <dt className="text-muted-foreground">البريد</dt>
            <dd>
              <En>{s.email}</En>
            </dd>
            <dt className="text-muted-foreground">الهاتف</dt>
            <dd>{s.phone ? <RevealPhone studentId={s.id} masked={maskPhone(s.phone)} /> : "—"}</dd>
            <dt className="text-muted-foreground">العمر</dt>
            <dd>{s.birth_date ? `${ageFrom(s.birth_date)} سنة` : "—"}</dd>
            <dt className="text-muted-foreground">المكان</dt>
            <dd>{[s.governorates?.name_ar, s.city].filter(Boolean).join(" · ") || "—"}</dd>
            <dt className="text-muted-foreground">المدرسة</dt>
            <dd>
              {s.school ?? "—"} · {gradeLabel(s.grade)} · {streamLabel(s.stream)}
            </dd>
            <dt className="text-muted-foreground">الهدف</dt>
            <dd>
              <En>{targetExamLabel(app?.target_exam)}</En> · {targetDateLabel(app?.target_date)} · {s.daily_goal_minutes} دقيقة يومياً
            </dd>
            <dt className="text-muted-foreground">المسار</dt>
            <dd>
              {(enrollments ?? []).map((e, i) => (
                <span key={i} className="block">
                  <MixedText text={e.paths?.title ?? ""} /> {e.levels?.code ? <En>({e.levels.code})</En> : null} {e.is_primary ? "· الأساسي" : ""}
                </span>
              ))}
            </dd>
            <dt className="text-muted-foreground">المهارات</dt>
            <dd>
              {(skills ?? []).map((k) => `${SKILL_LABELS_AR[k.skill as Skill] ?? k.skill}: ${k.level}`).join(" · ") || "—"}
            </dd>
            <dt className="text-muted-foreground">الشهادات</dt>
            <dd>{(certs ?? []).map((c) => c.levels?.code).join(" · ") || "—"}</dd>
          </dl>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 text-lg font-bold">الموافقات والطلب</h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[15px]">
            <dt className="text-muted-foreground">موافقة ولي الأمر</dt>
            <dd>{fmt(app?.guardian_consent_at)}</dd>
            <dt className="text-muted-foreground">موافقة الخصوصية</dt>
            <dd>{fmt(app?.privacy_consent_at)}</dd>
            <dt className="text-muted-foreground">أُرسل الطلب</dt>
            <dd>{fmt(app?.submitted_at)}</dd>
            <dt className="text-muted-foreground">قرار الطلب</dt>
            <dd>{fmt(app?.reviewed_at)}</dd>
            <dt className="text-muted-foreground">انضم</dt>
            <dd>{fmt(s.created_at)}</dd>
          </dl>
          <div className="mt-4 border-t border-muted pt-4">
            <StudentStatusForm studentId={s.id} status={s.status} />
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="mb-2 text-lg font-bold">آخر النشاط</h2>
        {activity.length === 0 ? (
          <p className="text-sm text-muted-foreground">لا يوجد نشاط بعد.</p>
        ) : (
          activity.map((a, i) => (
            <div key={i} className="flex items-center gap-3 border-b border-muted py-2 text-sm last:border-b-0">
              <span className="w-40 flex-none text-muted-foreground">{fmt(a.at)}</span>
              <span className="flex-1">
                <MixedText text={a.text} />
              </span>
              {a.offline && (
                <Badge tone="info">
                  <CloudOff className="me-1 size-3" aria-hidden="true" />
                  أُرسل بعد العودة للاتصال
                </Badge>
              )}
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
