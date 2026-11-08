import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Bot, Brain, Check, Clock, Cog, Gauge, History, OctagonAlert, Sparkles, X } from "lucide-react";
import { IconTile, PageHead, Panel, type Tone } from "@/components/console/ui";
import { En } from "@/components/en";
import { quotaStatus } from "@/lib/ai/limits";
import { STEP_AR } from "@/lib/console/notices";
import { Badge } from "@/components/ui/badge";
import { AddRuleForm, AutoRefresh, QueuePlanForm } from "@/components/admin/agent-forms";
import { setAgentPaused, toggleRule } from "./actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { JOB_BUDGET } from "@/lib/agent/runner";
import { JOB_KIND_AR, JOB_STATUS_AR } from "@/lib/agent/labels";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "عقل رفد" };

function when(iso: string): string {
  return new Intl.DateTimeFormat("ar", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Aden" }).format(new Date(iso));
}

export default async function AgentPage() {
  const supabase = await createClient();
  const [{ data: paths }, { data: jobs }, { data: rules }, { data: pausedRow }] = await Promise.all([
    supabase.from("paths").select("id, title").order("position"),
    supabase.from("agent_jobs").select("id, kind, status, progress, step, created_at, paths(title)").order("created_at", { ascending: false }).limit(30),
    supabase.from("agent_memory").select("id, text, source, active, created_at, paths(title)").order("created_at", { ascending: false }).limit(50),
    supabase.from("settings").select("value").eq("key", "agent_paused").maybeSingle(),
  ]);
  const paused = pausedRow?.value === true;
  const list = jobs ?? [];
  const waiting = list.filter((j) => j.status === "needs_review");
  const working = list.some((j) => j.status === "queued" || j.status === "running");

  const running = list.find((j) => j.status === "running");
  const quotas = await quotaStatus();
  const TONE_OF: Record<string, Tone> = { running: "ai", queued: "off", needs_review: "gold", approved: "ok", rejected: "off", failed: "red" };
  const ICON_OF: Record<string, typeof Bot> = { running: Cog, queued: Clock, needs_review: BadgeCheck, approved: Check, rejected: X, failed: OctagonAlert };

  return (
    <div className="flex flex-col gap-5">
      <AutoRefresh active={working} />
      <PageHead title="عقل رفد" sub="وكيل المنصة: يرسم الخرائط ويبني الوحدات. لا يصل شيء للطلاب قبل اعتمادك، وكل ملاحظة تكتبها يحفظها ويلتزم بها." />

      <Panel className={paused ? "flex flex-wrap items-center gap-3 border-accent bg-warning-tint" : "flex flex-wrap items-center gap-3"}>
        <IconTile icon={Bot} tone={paused ? "gold" : "ai"} size="lg" />
        <div className="min-w-[220px] flex-1">
          <h2 className="font-bold">{paused ? "الوكيل متوقف الآن" : "الوكيل يعمل"}</h2>
          <p className="text-sm text-muted-foreground">
            {paused
              ? "لن يبدأ أي عمل جديد، والعمل الجاري يعود للطابور. شغّله متى شئت ويكمل من حيث توقف."
              : `يعمل كل 30 دقيقة. لكل مهمة حد آمن: ${JOB_BUDGET.modelCalls} طلباً لـ Gemini و${JOB_BUDGET.searches} بحثاً في يوتيوب و${JOB_BUDGET.minutes} دقيقة.`}
          </p>
        </div>
        <form action={setAgentPaused}>
          <input type="hidden" name="paused" value={paused ? "0" : "1"} />
          <SubmitButton variant={paused ? "primary" : "secondary"} pendingLabel="…" className="min-h-11">
            {paused ? "شغّل الوكيل" : "أوقف الوكيل"}
          </SubmitButton>
        </form>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          {running && (
            <Panel
              title={`يعمل الآن: ${JOB_KIND_AR[running.kind] ?? running.kind}`}
              icon={Cog}
              className="bg-[linear-gradient(160deg,var(--color-ai-tint),var(--color-card)_70%)]"
            >
              <span className="block h-2 overflow-hidden rounded-full bg-muted">
                <span className="block h-full rounded-full bg-ai" style={{ width: `${Math.max(4, running.progress)}%` }} />
              </span>
              <p className="mt-2 text-sm text-muted-foreground">
                {running.step ? (STEP_AR[running.step] ?? running.step) : "بدأ"} · {running.progress}% · {running.paths?.title}
              </p>
              <Link href={`/admin/agent/${running.id}`} className="mt-2 inline-block text-sm font-semibold">
                التفاصيل ←
              </Link>
            </Panel>
          )}

          {waiting.length > 0 && (
            <Panel title={`بانتظار مراجعتك (${waiting.length})`} icon={BadgeCheck}>
              <div className="flex flex-col gap-2">
                {waiting.map((j) => (
                  <Link
                    key={j.id}
                    href={`/admin/agent/${j.id}`}
                    className="flex min-h-11 items-center justify-between rounded-xl bg-warning-tint px-3 font-semibold text-warning no-underline"
                  >
                    {JOB_KIND_AR[j.kind] ?? j.kind} · {j.paths?.title}
                    <span aria-hidden="true">←</span>
                  </Link>
                ))}
              </div>
            </Panel>
          )}

          <Panel title="آخر المهام" icon={History}>
            {list.length === 0 ? (
              <p className="text-sm text-muted-foreground">لم يبدأ الوكيل أي عمل بعد.</p>
            ) : (
              <ul className="flex flex-col">
                {list.map((j) => {
                  const st = JOB_STATUS_AR[j.status] ?? { label: j.status, tone: "muted" as const };
                  const Icon = ICON_OF[j.status] ?? Bot;
                  return (
                    <li key={j.id} className="border-b border-dashed border-border last:border-b-0">
                      <Link
                        href={`/admin/agent/${j.id}`}
                        className="grid min-h-14 grid-cols-[34px_1fr_auto] items-center gap-3 py-2 text-foreground no-underline hover:text-foreground"
                      >
                        <IconTile icon={Icon} tone={TONE_OF[j.status] ?? "off"} size="sm" />
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">
                            {JOB_KIND_AR[j.kind] ?? j.kind} · {j.paths?.title}
                          </span>
                          <span className="block text-xs text-muted-foreground">{when(j.created_at)}</span>
                        </span>
                        <Badge tone={st.tone}>{st.label}</Badge>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <Panel title="الحصص المجانية اليوم" icon={Gauge}>
            {quotas.length === 0 ? (
              <p className="text-sm text-muted-foreground">لا توجد حصص مضبوطة.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {quotas.map((q) => (
                  <li key={q.provider} className="grid grid-cols-[56px_1fr] items-center gap-3">
                    <span
                      className="flex size-14 items-center justify-center rounded-full"
                      style={{
                        background: `conic-gradient(var(--color-${q.alert ? "accent" : "primary"}) ${Math.min(100, q.percent)}%, var(--color-muted) 0)`,
                      }}
                      role="img"
                      aria-label={`${q.percent}%`}
                    >
                      <span className="flex size-11 items-center justify-center rounded-full bg-card font-en text-xs font-bold">{q.percent}%</span>
                    </span>
                    <span>
                      <En className="block font-semibold">{q.provider}</En>
                      <span className="text-[13px] text-muted-foreground">
                        {q.requests} من {q.quota} طلب
                      </span>
                      {q.alert && <span className="mt-0.5 block text-xs font-semibold text-warning">تجاوز حد التنبيه</span>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="اطلب عملاً جديداً" icon={Sparkles}>
            <p className="mb-3 text-sm text-muted-foreground">يصمّم الوكيل المستويات والوحدات، ثم تصلك الخطة للمراجعة. يبدأ خلال 30 دقيقة على الأكثر.</p>
            <QueuePlanForm paths={paths ?? []} />
          </Panel>
        </div>
      </div>

      <Panel title="ما تعلّمه من ملاحظاتك" icon={Brain}>
        <p className="mb-3 text-sm text-muted-foreground">ملاحظات مراجعاتك وقواعدك. يقرأها الوكيل قبل كل عمل.</p>
        <AddRuleForm paths={paths ?? []} />
        <ul className="mt-2 flex flex-col">
          {(rules ?? []).map((r) => (
            <li key={r.id} className="flex items-start gap-3 border-b border-dashed border-border py-2.5 last:border-b-0">
              <div className={`min-w-0 flex-1 text-sm ${r.active ? "" : "text-muted-foreground line-through"}`}>
                <p>{r.text}</p>
                <p className="text-xs text-muted-foreground">
                  {r.source === "review" ? "من مراجعة" : "قاعدة يدوية"} · {r.paths?.title ?? "كل المسارات"}
                </p>
              </div>
              <form action={toggleRule}>
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="active" value={String(!r.active)} />
                <button type="submit" className="min-h-10 rounded-lg px-2.5 text-xs font-semibold text-primary">
                  {r.active ? "أوقفها" : "فعّلها"}
                </button>
              </form>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
