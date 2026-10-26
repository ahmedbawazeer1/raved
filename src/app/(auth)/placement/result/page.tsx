import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { En } from "@/components/en";
import { MixedText } from "@/components/mixed-text";
import { requireActiveStudent } from "@/lib/auth/session";
import { LEVEL_SUMMARY_AR, LEVELS, RETAKE_DAYS, SKILL_LABELS_AR, SKILLS, type Level, type Skill } from "@/lib/placement/engine";
import { getPrimaryPath } from "@/lib/student/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "نتيجة اختبار المستوى" };

const isLevel = (v: unknown): v is Level => (LEVELS as readonly unknown[]).includes(v);

function months(n: number): string {
  if (n === 1) return "شهر واحد";
  if (n === 2) return "شهرين";
  if (n <= 10) return `${n} أشهر`;
  return `${n} شهراً`;
}

export default async function PlacementResultPage() {
  const { userId, profile } = await requireActiveStudent();
  const path = await getPrimaryPath(userId);
  if (!path) redirect("/student");

  const supabase = await createClient();
  const { data: attempt } = await supabase
    .from("placement_attempts")
    .select("overall_level, skill_levels, eta_months, completed_at, units(code, title, position, levels(code))")
    .eq("student_id", userId)
    .eq("path_id", path.id)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!attempt || !isLevel(attempt.overall_level)) redirect("/placement");

  const overall = attempt.overall_level;
  const skillLevels = (attempt.skill_levels ?? {}) as Partial<Record<Skill, { level: Level; percent: number }>>;
  const unit = attempt.units;
  const retakeAt = attempt.completed_at
    ? new Intl.DateTimeFormat("ar", { day: "numeric", month: "long", year: "numeric" }).format(
        new Date(new Date(attempt.completed_at).getTime() + RETAKE_DAYS * 86_400_000),
      )
    : null;

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex items-center gap-2 border-b border-border bg-card px-2 py-2">
        <Link href="/student" aria-label="رجوع" className="flex size-11 items-center justify-center rounded-full text-foreground">
          <ChevronRight className="size-[22px]" aria-hidden="true" />
        </Link>
        <h1 className="text-base font-bold">نتيجة اختبار المستوى</h1>
      </header>

      <main className="mx-auto flex w-full max-w-[640px] flex-col gap-3 p-4">
        <Card className="flex flex-col items-center gap-1.5 p-5 text-center">
          <p className="text-[13px] text-muted-foreground">مستواك التقديري الآن</p>
          <En as="p" className="text-[46px] leading-none font-bold text-primary">
            {overall}
          </En>
          <p className="text-sm leading-relaxed">{LEVEL_SUMMARY_AR[overall]}</p>
        </Card>

        <Card className="px-4 py-1">
          {SKILLS.map((skill) => {
            const s = skillLevels[skill];
            return (
              <div key={skill} className="flex items-center gap-3 border-b border-muted py-3 text-sm last:border-b-0">
                <span className="w-[66px]">{SKILL_LABELS_AR[skill]}</span>
                <div
                  role="progressbar"
                  aria-label={SKILL_LABELS_AR[skill]}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={s?.percent ?? 0}
                  className="h-2 flex-1 overflow-hidden rounded-full bg-border"
                >
                  <span className="block h-full rounded-full bg-primary" style={{ width: `${s?.percent ?? 0}%` }} />
                </div>
                <En className="w-[34px] font-semibold">{s?.level ?? "A1"}</En>
              </div>
            );
          })}
        </Card>

        <section className="rounded-[14px] bg-warning-tint p-3.5 text-sm leading-relaxed">
          <b className="text-warning">خطتك: </b>
          {unit ? (
            <>
              تبدأ من الوحدة {unit.position} في <En>{unit.levels?.code ?? overall}</En>: <MixedText text={unit.title} />.
            </>
          ) : (
            <>تبدأ من أول وحدة في <En>{overall}</En> عندما تُنشر، وحتى ذلك الحين تدرس الوحدات المتاحة.</>
          )}
          {attempt.eta_months ? (
            <>
              {" "}
              بمعدل {profile.daily_goal_minutes} دقيقة يومياً تصل <En>B2</En> في حوالي {months(attempt.eta_months)}.
            </>
          ) : null}
        </section>
        <p className="text-xs text-muted-foreground">
          النتيجة تقديرية، وليست شهادة.{retakeAt ? ` تستطيع إعادة الاختبار بعد ${retakeAt} لقياس تقدمك.` : ""}
        </p>
      </main>

      <footer className="mt-auto border-t border-border bg-card px-4 pt-3 pb-5">
        <div className="mx-auto max-w-[640px]">
          <Button asChild className="w-full">
            <Link href="/student">ابدأ التعلّم</Link>
          </Button>
        </div>
      </footer>
    </div>
  );
}
