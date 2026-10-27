import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { En } from "@/components/en";
import { ExamCards } from "@/components/student/exam-cards";
import { targetExamLabel } from "@/lib/apply/options";
import { requireActiveStudent } from "@/lib/auth/session";
import { parseFeatures } from "@/lib/paths/features";
import { examTrackOpen } from "@/lib/student/stats";
import { getPrimaryPath } from "@/lib/student/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "مسار الامتحان" };

// The exam-prep content is built after launch (PRD 8.10); this is the plan students see.
const ROADMAP = [
  { title: "فهم شكل الامتحان ونظام الدرجات", time: "أسبوع" },
  { title: "الاستماع: الأقسام وأنواع الأسئلة", time: "3 أسابيع" },
  { title: "القراءة", time: "3 أسابيع" },
  { title: "الكتابة", time: "3 أسابيع" },
  { title: "المحادثة", time: "أسبوعان" },
  { title: "اختبارات تجريبية موقوتة", time: "أسبوعان" },
];

export default async function ExamTrackPage() {
  const { userId, application } = await requireActiveStudent();
  const path = await getPrimaryPath(userId);
  if (!path || !parseFeatures(path.features).exam_track) notFound();
  const supabase = await createClient();
  const [{ data: placement }, { data: exams }] = await Promise.all([
    supabase
      .from("placement_attempts")
      .select("overall_level")
      .eq("student_id", userId)
      .eq("path_id", path.id)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("exams").select("code, name, availability_ye, locations, fee_note, payment_note, official_practice_url, verified_at").order("position"),
  ]);
  const open = examTrackOpen(placement?.overall_level);
  const exam = application?.target_exam && application.target_exam !== "undecided" ? targetExamLabel(application.target_exam) : null;

  return (
    <main className="mx-auto flex w-full max-w-[720px] flex-col gap-4 px-4 py-5">
      <h1 className="text-2xl font-bold">
        مسار الامتحان{exam ? <>: <En>{exam}</En></> : null}
      </h1>
      <Card className="flex items-center gap-3 border-accent bg-warning-tint p-4">
        <Lock className="size-6 flex-none text-warning" aria-hidden="true" />
        <p className="text-sm leading-relaxed">
          {open ? (
            "وصلت إلى المستوى المطلوب. محتوى التدريب على الامتحان قيد الإعداد، وسنبلغك فور نشره."
          ) : (
            <>
              يُفتح عندما يصل مستواك إلى <En>B1+</En>. أكمل وحدات المستويات العامة أولاً، فهي أساس الدرجة العالية.
            </>
          )}
        </p>
      </Card>
      <Card className="px-4 py-1.5">
        {ROADMAP.map((r, i) => (
          <div key={r.title} className="flex items-center gap-3 border-b border-muted py-3 text-sm last:border-b-0">
            <span className="flex size-7 flex-none items-center justify-center rounded-full bg-muted font-en text-xs font-bold text-subtle">{i + 1}</span>
            <span className="flex-1">{r.title}</span>
            <span className="text-muted-foreground">{r.time}</span>
          </div>
        ))}
      </Card>
      <p className="text-xs text-muted-foreground">رفد لا تَعِد بدرجة معيّنة في أي امتحان، وشهاداتها شهادات إتمام داخلية.</p>
      <h2 className="mt-2 font-bold">الامتحانات من اليمن</h2>
      <ExamCards exams={exams ?? []} />
    </main>
  );
}
