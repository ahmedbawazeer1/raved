import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Activity, BookA, BookOpenCheck, CloudOff, Contact, Flame, ShieldCheck, Swords, Trophy } from "lucide-react";
import { IconTile, Kpi, PageHead, Panel } from "@/components/console/ui";
import { Badge } from "@/components/ui/badge";
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
    .select(
      "id, full_name, email, phone, governorate, city, school, grade, stream, birth_date, status, role, created_at, daily_goal_minutes, governorates(name_ar)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!s || s.role !== "student") notFound();

  const [
    { data: app },
    { data: enrollments },
    { data: lessons },
    { data: quizzes },
    { data: vocab },
    { data: skills },
    { data: speaking },
    { data: writing },
    { data: certs },
  ] = await Promise.all([
    supabase
      .from("applications")
      .select("status, target_exam, target_date, daily_minutes, motivation, guardian_consent_at, privacy_consent_at, submitted_at, reviewed_at")
      .eq("student_id", id)
      .maybeSingle(),
    supabase.from("enrollments").select("is_primary, paths(title), levels!enrollments_current_level_id_fkey(code)").eq("student_id", id),
    supabase
      .from("lesson_progress")
      .select("completed_at, synced_at, lessons(title)")
      .eq("student_id", id)
      .eq("status", "completed")
      .order("completed_at", { ascending: false }),
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

  const tone = (s.status === "active" ? "success" : s.status === "suspended" ? "destructive" : "muted") as "success" | "destructive" | "muted";
  const primary = (enrollments ?? []).find((e) => e.is_primary);
  return (
    <div className="flex flex-col gap-5">
      <PageHead
        crumbs={[{ label: "الطلاب", href: "/admin/students" }]}
        title={s.full_name || "—"}
        sub={[s.governorates?.name_ar, s.city, gradeLabel(s.grade), streamLabel(s.stream)].filter(Boolean).join(" · ")}
      >
        <div className="flex items-center gap-2">
          <Badge tone={tone}>{STUDENT_STATUS_AR[s.status] ?? s.status}</Badge>
          {primary?.levels?.code && <En className="rounded-full bg-primary-tint px-2.5 py-0.5 text-sm font-semibold text-primary">{primary.levels.code}</En>}
        </div>
      </PageHead>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="دروس مكتملة" value={(lessons ?? []).length} icon={BookOpenCheck} tone="green" />
        <Kpi label="اختبارات ناجحة" value={`${(quizzes ?? []).filter((q) => q.passed).length} / ${(quizzes ?? []).length}`} icon={Trophy} tone="gold" />
        <Kpi label="كلمات" value={(vocab ?? []).length} icon={BookA} tone="blue" />
        <Kpi label="أيام متتالية" value={streak} icon={Flame} tone="red" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Panel title="آخر النشاط" icon={Activity}>
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا يوجد نشاط بعد.</p>
          ) : (
            <ul className="flex flex-col">
              {activity.map((a, i) => (
                <li key={i} className="grid grid-cols-[34px_1fr] items-start gap-2.5 border-b border-dashed border-border py-2.5 text-sm last:border-b-0">
                  <IconTile icon={a.text.startsWith("اختبار") ? Swords : BookOpenCheck} tone={a.text.startsWith("اختبار") ? "gold" : "ok"} size="sm" />
                  <span className="min-w-0">
                    <MixedText text={a.text} />
                    <span className="block text-xs text-muted-foreground">
                      {fmt(a.at)}
                      {a.offline && (
                        <span className="ms-2 inline-flex items-center gap-1 text-info">
                          <CloudOff className="size-3" aria-hidden="true" /> أُرسل بعد العودة للاتصال
                        </span>
                      )}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="flex flex-col gap-5">
          <Panel title="البيانات" icon={Contact}>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[15px]">
              <dt className="text-muted-foreground">البريد</dt>
              <dd className="min-w-0 truncate">
                <En>{s.email}</En>
              </dd>
              <dt className="text-muted-foreground">الهاتف</dt>
              <dd>{s.phone ? <RevealPhone studentId={s.id} masked={maskPhone(s.phone)} /> : "—"}</dd>
              <dt className="text-muted-foreground">العمر</dt>
              <dd>{s.birth_date ? `${ageFrom(s.birth_date)} سنة` : "—"}</dd>
              <dt className="text-muted-foreground">المدرسة</dt>
              <dd>{s.school ?? "—"}</dd>
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
              <dd>{(skills ?? []).map((k) => `${SKILL_LABELS_AR[k.skill as Skill] ?? k.skill}: ${k.level}`).join(" · ") || "—"}</dd>
              <dt className="text-muted-foreground">الشهادات</dt>
              <dd>{(certs ?? []).map((c) => c.levels?.code).join(" · ") || "—"}</dd>
            </dl>
          </Panel>

          <Panel title="الموافقات والحساب" icon={ShieldCheck}>
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
            <div className="mt-4 border-t border-border pt-4">
              <StudentStatusForm studentId={s.id} status={s.status} />
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
