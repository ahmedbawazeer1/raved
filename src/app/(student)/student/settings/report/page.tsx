import type { Metadata } from "next";
import { MessageCircle } from "lucide-react";
import { yemenDate } from "@shared/student/stats";
import { watering } from "@shared/student/watering";
import { Card } from "@/components/ui/card";
import { TopBar } from "@/components/student/top-bar";
import { requireActiveStudent } from "@/lib/auth/session";
import { getCurriculum, getPrimaryPath } from "@/lib/student/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "تقرير ولي الأمر" };

const DAYS = ["س", "ح", "ن", "ث", "ر", "خ", "ج"];

/** The last 8 days (covers this Saturday→Friday week). */
const since = () => new Date(Date.now() - 8 * 86_400_000).toISOString();

/** This week's numbers for a guardian (no sensitive data), sent by WhatsApp with one tap. */
export default async function ParentReportPage() {
  const { profile, userId } = await requireActiveStudent();
  const supabase = await createClient();
  const [{ data: lessons }, { data: drops }, { data: quizzes }, { data: vocab }, path] = await Promise.all([
    supabase.from("lesson_progress").select("completed_at").eq("student_id", userId).eq("status", "completed"),
    supabase.from("xp_events").select("points, created_at").eq("student_id", userId).gte("created_at", since()),
    supabase.from("quiz_attempts").select("created_at").eq("student_id", userId),
    supabase.from("vocab_reviews").select("last_reviewed_at").eq("student_id", userId),
    getPrimaryPath(userId),
  ]);
  const w = watering([
    ...(lessons ?? []).map((r) => r.completed_at),
    ...(quizzes ?? []).map((r) => r.created_at),
    ...(vocab ?? []).map((r) => r.last_reviewed_at),
  ]);
  // Saturday of this week (Yemen days), then the drops of each day.
  const today = yemenDate(new Date());
  const day = (offset: number) => {
    const d = new Date(`${today}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - w.todayIndex + offset);
    return d.toISOString().slice(0, 10);
  };
  const week = Array.from({ length: 7 }, (_, i) => day(i));
  const perDay = week.map((d) => (drops ?? []).filter((x) => yemenDate(x.created_at) === d).reduce((n, x) => n + x.points, 0));
  const lessonsWeek = (lessons ?? []).filter((r) => r.completed_at && week.includes(yemenDate(r.completed_at))).length;
  const watered = w.week.filter(Boolean).length;
  const curriculum = path ? await getCurriculum(userId, path.id) : null;
  const level = curriculum?.units.find((u) => u.state === "now")?.levelCode ?? curriculum?.units.at(-1)?.levelCode ?? "—";
  const max = Math.max(10, ...perDay);
  const first = profile.full_name.split(" ")[0];
  const text = [
    `تقرير رفد الأسبوعي: ${first}`,
    `دروس هذا الأسبوع: ${lessonsWeek}`,
    `أيام السقاية (الدراسة): ${watered} من 7`,
    `القطرات هذا الأسبوع: ${perDay.reduce((a, b) => a + b, 0)}`,
    `المستوى الحالي: ${level}`,
    "رفد: منصة تعليمية مجانية لطلاب الثانوية في اليمن.",
  ].join("\n");

  return (
    <>
      <TopBar backHref="/student/settings" title="تقرير ولي الأمر" subtitle={<>أرقام هذا الأسبوع فقط، بلا بيانات حساسة</>} />
      <main className="mx-auto flex w-full max-w-[640px] flex-col gap-4 px-4 py-5">
        <Card className="flex flex-col gap-4 p-5">
          <b>تقرير الأسبوع لولي الأمر</b>
          <div>
            <p className="mb-2 text-sm text-muted-foreground">القطرات يومياً (كل درس أو تدريب يضيف قطرات)</p>
            <div className="flex h-32 items-end gap-2" role="img" aria-label={`القطرات يومياً: ${perDay.join("، ")}`}>
              {perDay.map((n, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t-lg bg-[linear-gradient(180deg,#5CC8F0,#1C6FA3)]"
                    style={{ height: `${Math.max(4, (n / max) * 100)}px`, opacity: i > w.todayIndex ? 0.25 : 1 }}
                  />
                  <span className={i === w.todayIndex ? "text-xs font-bold" : "text-xs text-muted-foreground"}>{DAYS[i]}</span>
                </div>
              ))}
            </div>
          </div>
          <dl className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-primary-tint p-3">
              <dt className="text-xs text-primary-hover">دروس</dt>
              <dd className="font-en text-2xl font-bold text-primary">{lessonsWeek}</dd>
            </div>
            <div className="rounded-2xl bg-[#E5F4FC] p-3">
              <dt className="text-xs text-[#1C6FA3]">سقاية</dt>
              <dd className="font-en text-2xl font-bold text-[#1C6FA3]">{watered}/7</dd>
            </div>
            <div className="rounded-2xl bg-[#FFF4D6] p-3">
              <dt className="text-xs text-warning">المستوى</dt>
              <dd className="font-en text-2xl font-bold text-warning">{level}</dd>
            </div>
          </dl>
        </Card>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(text)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#1FA855] font-bold text-white no-underline shadow-[0_4px_0_#157A3D] hover:text-white active:translate-y-1 active:shadow-none"
        >
          <MessageCircle className="size-5" aria-hidden="true" />
          أرسل بواتساب
        </a>
        <p className="text-center text-xs text-muted-foreground">لا يُرسل رقم ولا بريد. أنت تختار من ترسل له.</p>
      </main>
    </>
  );
}
