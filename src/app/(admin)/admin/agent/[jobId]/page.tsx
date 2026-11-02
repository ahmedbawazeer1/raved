import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/form";
import { En } from "@/components/en";
import { AutoRefresh, ReviewJobForm } from "@/components/admin/agent-forms";
import { BuiltUnitReview } from "@/components/admin/built-unit-review";
import { retryJob } from "../actions";
import { JOB_KIND_AR, JOB_STATUS_AR } from "@/lib/agent/labels";
import { countUnits, pathPlanSchema } from "@/lib/agent/plan";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "عمل الوكيل" };

function time(iso: string): string {
  return new Intl.DateTimeFormat("ar", { timeStyle: "short", timeZone: "Asia/Aden" }).format(new Date(iso));
}

export default async function AgentJobPage({ params }: PageProps<"/admin/agent/[jobId]">) {
  const { jobId } = await params;
  const supabase = await createClient();
  const { data: job } = await supabase.from("agent_jobs").select("*, paths(title)").eq("id", jobId).maybeSingle();
  if (!job) notFound();
  const st = JOB_STATUS_AR[job.status] ?? { label: job.status, tone: "muted" as const };
  const log = (job.log as { at: string; msg: string }[]) ?? [];
  const plan = job.kind === "plan_path" && job.output ? pathPlanSchema.safeParse(job.output) : null;
  const working = job.status === "queued" || job.status === "running";

  return (
    <div className="flex max-w-4xl flex-col gap-5">
      <AutoRefresh active={working} />
      <Link href="/admin/agent" className="flex items-center gap-1 text-sm">
        <ArrowRight className="size-4" aria-hidden="true" />
        عقل رفد
      </Link>
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">
          {JOB_KIND_AR[job.kind] ?? job.kind} · {job.paths?.title}
        </h1>
        <Badge tone={st.tone}>{st.label}</Badge>
      </header>

      {working && (
        <Card className="flex flex-col gap-2 p-4">
          <p className="text-sm font-semibold">{job.status === "queued" ? "في الانتظار: يبدأ الوكيل خلال 30 دقيقة على الأكثر." : "الوكيل يعمل الآن…"}</p>
          <div className="h-2.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={job.progress} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-ai transition-[width]" style={{ width: `${job.progress}%` }} />
          </div>
        </Card>
      )}
      {job.status === "failed" && (
        <div className="flex flex-col gap-2">
          <Alert tone="error">{job.error ?? "توقف الوكيل."}</Alert>
          <form action={retryJob}>
            <input type="hidden" name="job_id" value={job.id} />
            <button type="submit" className="min-h-11 rounded-xl bg-primary px-4 font-semibold text-white">
              أعد المحاولة
            </button>
          </form>
        </div>
      )}
      {job.review_note && (
        <Alert tone="info">
          <b>ملاحظتك:</b> {job.review_note}
        </Alert>
      )}
      {typeof (job.input as { feedback?: unknown })?.feedback === "string" && (
        <Alert tone="info">
          <b>نسخة جديدة تتبع ملاحظتك:</b> {(job.input as { feedback: string }).feedback}
        </Alert>
      )}

      {plan?.success && (
        <section className="flex flex-col gap-4" aria-labelledby="plan-title">
          <Card className="flex flex-col gap-2 p-5">
            <h2 id="plan-title" className="text-lg font-bold">
              الخطة المقترحة · {plan.data.levels.length} مستويات · {countUnits(plan.data)} وحدة
            </h2>
            <p className="leading-relaxed text-muted-foreground">{plan.data.summary_ar}</p>
          </Card>
          {plan.data.levels.map((level) => (
            <Card key={level.code} className="flex flex-col gap-3 p-5">
              <div>
                <h3 className="text-lg font-bold">
                  <En>{level.code}</En> · {level.title_ar}
                </h3>
                <p className="text-sm text-muted-foreground">{level.goal_ar}</p>
              </div>
              <ol className="flex flex-col gap-2">
                {level.units.map((u) => (
                  <li key={u.code}>
                    <details className="rounded-xl border border-border bg-background px-3 py-2">
                      <summary className="flex min-h-10 items-center gap-2 font-semibold">
                        <En className="text-xs text-muted-foreground">{u.code}</En>
                        <span className="flex-1">
                          {u.title_ar} · <En>{u.title_en}</En>
                        </span>
                        <Badge tone="warning">{u.stop_ar}</Badge>
                      </summary>
                      <div className="flex flex-col gap-1.5 pt-2 pb-1 text-sm leading-relaxed">
                        <p>
                          <b>الموقف:</b> {u.situation_ar}
                        </p>
                        <p>
                          <b>القاعدة:</b> <En>{u.grammar}</En> · <b>الكلمات:</b> <En>{u.vocab_domain}</En>
                        </p>
                        <ul className="list-disc ps-5">
                          {u.objectives_ar.map((o) => (
                            <li key={o}>{o}</li>
                          ))}
                        </ul>
                      </div>
                    </details>
                  </li>
                ))}
              </ol>
            </Card>
          ))}
        </section>
      )}
      {plan && !plan.success && <Alert tone="error">نتيجة الوكيل غير صالحة للعرض.</Alert>}
      {job.kind === "build_unit" && job.output != null && <BuiltUnitReview output={job.output} />}

      {job.status === "needs_review" && (
        <Card className="flex flex-col gap-3 border-primary p-5">
          <h2 className="text-lg font-bold">قرارك</h2>
          <ReviewJobForm jobId={job.id} />
        </Card>
      )}

      <Card className="flex flex-col gap-2 p-5">
        <h2 className="font-bold">سجل العمل</h2>
        <ol className="flex flex-col gap-1 text-sm">
          {log.map((l, i) => (
            <li key={i} className="flex gap-2">
              <span className="w-14 flex-none font-en text-xs text-muted-foreground">{time(l.at)}</span>
              {l.msg}
            </li>
          ))}
        </ol>
        {job.model && (
          <p className="text-xs text-muted-foreground">
            النموذج: <En>{job.model}</En>
          </p>
        )}
      </Card>
    </div>
  );
}
