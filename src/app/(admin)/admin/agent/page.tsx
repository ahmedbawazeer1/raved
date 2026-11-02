import type { Metadata } from "next";
import Link from "next/link";
import { Bot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { AddRuleForm, AutoRefresh, QueuePlanForm } from "@/components/admin/agent-forms";
import { toggleRule } from "./actions";
import { JOB_KIND_AR, JOB_STATUS_AR } from "@/lib/agent/labels";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "عقل رفد" };

function when(iso: string): string {
  return new Intl.DateTimeFormat("ar", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Aden" }).format(new Date(iso));
}

export default async function AgentPage() {
  const supabase = await createClient();
  const [{ data: paths }, { data: jobs }, { data: rules }] = await Promise.all([
    supabase.from("paths").select("id, title").order("position"),
    supabase.from("agent_jobs").select("id, kind, status, progress, step, created_at, paths(title)").order("created_at", { ascending: false }).limit(30),
    supabase.from("agent_memory").select("id, text, source, active, created_at, paths(title)").order("created_at", { ascending: false }).limit(50),
  ]);
  const list = jobs ?? [];
  const waiting = list.filter((j) => j.status === "needs_review");
  const working = list.some((j) => j.status === "queued" || j.status === "running");

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <AutoRefresh active={working} />
      <header className="flex items-start gap-3">
        <span className="flex size-12 flex-none items-center justify-center rounded-2xl bg-ai-tint text-ai">
          <Bot className="size-7" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-2xl font-bold">عقل رفد</h1>
          <p className="text-sm text-muted-foreground">
            وكيل المنصة: يصمّم المسارات ويبني الدروس وحده. لا يصل شيء للطلاب قبل اعتمادك، وكل ملاحظة تكتبها يحفظها ويلتزم بها.
          </p>
        </div>
      </header>

      {waiting.length > 0 && (
        <Card className="flex flex-col gap-2 border-primary p-4">
          <h2 className="font-bold">بانتظار مراجعتك ({waiting.length})</h2>
          {waiting.map((j) => (
            <Link key={j.id} href={`/admin/agent/${j.id}`} className="flex min-h-11 items-center justify-between rounded-xl bg-primary-tint px-3 font-semibold">
              {JOB_KIND_AR[j.kind] ?? j.kind} · {j.paths?.title}
              <span aria-hidden="true">←</span>
            </Link>
          ))}
        </Card>
      )}

      <Card className="flex flex-col gap-3 p-5">
        <h2 className="text-lg font-bold">ابدأ</h2>
        <p className="text-sm text-muted-foreground">
          يصمّم الوكيل المستويات والوحدات وأهدافها ومحطاتها في رحلة حضرموت، ثم تصلك الخطة للمراجعة. يبدأ العمل خلال 30 دقيقة على الأكثر.
        </p>
        <QueuePlanForm paths={paths ?? []} />
      </Card>

      <Card className="flex flex-col gap-3 p-5">
        <h2 className="text-lg font-bold">آخر الأعمال</h2>
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground">لم يبدأ الوكيل أي عمل بعد.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {list.map((j) => {
              const st = JOB_STATUS_AR[j.status] ?? { label: j.status, tone: "muted" as const };
              return (
                <li key={j.id}>
                  <Link href={`/admin/agent/${j.id}`} className="flex min-h-14 items-center gap-3 py-2 text-foreground no-underline hover:text-foreground">
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">
                        {JOB_KIND_AR[j.kind] ?? j.kind} · {j.paths?.title}
                      </span>
                      <span className="block text-xs text-muted-foreground">{when(j.created_at)}</span>
                    </span>
                    {(j.status === "running" || j.status === "queued") && (
                      <span className="h-2 w-24 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                        <span className="block h-full rounded-full bg-ai" style={{ width: `${j.progress}%` }} />
                      </span>
                    )}
                    <Badge tone={st.tone}>{st.label}</Badge>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card className="flex flex-col gap-3 p-5">
        <h2 className="text-lg font-bold">ذاكرة الوكيل</h2>
        <p className="text-sm text-muted-foreground">ملاحظات مراجعاتك وقواعدك. يقرأها الوكيل قبل كل عمل.</p>
        <AddRuleForm paths={paths ?? []} />
        <ul className="flex flex-col divide-y divide-border">
          {(rules ?? []).map((r) => (
            <li key={r.id} className="flex items-start gap-3 py-2.5">
              <div className={`min-w-0 flex-1 text-sm ${r.active ? "" : "text-muted-foreground line-through"}`}>
                <p>{r.text}</p>
                <p className="text-xs text-muted-foreground">
                  {r.source === "review" ? "من مراجعة" : "قاعدة يدوية"} · {r.paths?.title ?? "كل المسارات"}
                </p>
              </div>
              <form action={toggleRule}>
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="active" value={String(!r.active)} />
                <button type="submit" className="min-h-9 rounded-lg px-2.5 text-xs font-semibold text-primary">
                  {r.active ? "أوقفها" : "فعّلها"}
                </button>
              </form>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
