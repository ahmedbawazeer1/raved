import type { Metadata } from "next";
import { AlertTriangle, LineChart, Swords, ThumbsDown, WandSparkles } from "lucide-react";
import { Empty, IconTile, Kpi, PageHead, Panel } from "@/components/console/ui";
import { ImproveUnitForm } from "@/components/studio/improve-form";
import { requireStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { improvementNote, ITEM_FLAG_AR, type ItemStat } from "@/lib/agent/improve";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "نتائج الوحدات" };

export default async function InsightsPage() {
  const { isAdmin } = await requireStaff();
  const supabase = await createClient();
  const { data: rows } = await supabase.from("unit_insights").select("*").order("flagged", { ascending: false }).order("computed_at", { ascending: false });
  const ids = (rows ?? []).map((r) => r.unit_id);
  const { data: units } = ids.length
    ? await supabase.from("units").select("id, code, title").in("id", ids)
    : { data: [] as { id: string; code: string; title: string }[] };
  const unitOf = new Map((units ?? []).map((u) => [u.id, u]));

  return (
    <div className="flex flex-col gap-5">
      <PageHead
        title="نتائج الوحدات والتحسين"
        sub="كل جمعة يحلل النظام إجابات الطلاب وتقييمهم للدروس، بلا أسماء: نسبة من أجاب صح عن كل سؤال، وهل يميّز بين من فهم ومن لم يفهم."
      />
      {!rows?.length ? (
        <Panel>
          <Empty icon={LineChart} tone="gold" title="لا نتائج بعد">
            تظهر نتائج كل وحدة بعد أن يدرسها الطلاب ويحلوا اختبارها.
          </Empty>
        </Panel>
      ) : (
        rows.map((r) => {
          const u = unitOf.get(r.unit_id);
          const items = (Array.isArray(r.items) ? r.items : []) as unknown as ItemStat[];
          const lessons = (Array.isArray(r.lessons) ? r.lessons : []) as unknown as { lesson: string; share: number; votes: number }[];
          const note = improvementNote(items, lessons);
          const pass = Math.round(Number(r.pass_rate) * 100);
          return (
            <section key={r.unit_id} className="flex flex-col gap-4">
              <h2 className="flex flex-wrap items-center gap-2 text-lg font-bold">
                <span dir="ltr" className="font-en">
                  {u?.code} · {u?.title}
                </span>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-[13px] font-semibold",
                    r.flagged ? "bg-warning-tint text-warning" : "bg-success-tint text-success",
                  )}
                >
                  {r.flagged ? `${r.flagged} تحتاج انتباهك` : "لا ملاحظات"}
                </span>
              </h2>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                <Kpi label="محاولات الاختبار" value={r.attempts} />
                <Kpi label="نجحوا" value={`${pass}%`} />
                <Kpi label="آخر تحليل" value={new Date(r.computed_at).toLocaleDateString("ar", { day: "numeric", month: "short" })} />
              </div>

              {items.length > 0 && (
                <Panel title="أسئلة الاختبار" icon={Swords} action={<span className="text-xs text-muted-foreground">الأصفر يحتاج انتباهك</span>}>
                  <ol className="flex flex-col">
                    {items.map((i, k) => (
                      <li
                        key={i.id}
                        className="grid grid-cols-[34px_1fr] items-center gap-3 border-b border-dashed border-border py-3 last:border-b-0 md:grid-cols-[34px_1fr_170px]"
                      >
                        <span
                          className={cn(
                            "flex size-[34px] items-center justify-center rounded-xl font-en font-bold",
                            i.flag ? "bg-warning-tint text-warning" : "bg-muted",
                          )}
                        >
                          {k + 1}
                        </span>
                        <div className="min-w-0">
                          <b dir="ltr" className="block text-start font-en text-sm">
                            {i.prompt}
                          </b>
                          {i.flag && (
                            <p className="mt-1.5 flex gap-1.5 rounded-xl bg-warning-tint px-2.5 py-1.5 text-[13px] text-warning">
                              <AlertTriangle className="mt-0.5 size-4 flex-none" aria-hidden="true" />
                              {ITEM_FLAG_AR[i.flag]}
                            </p>
                          )}
                        </div>
                        <div className="col-start-2 flex flex-col gap-1 text-xs text-muted-foreground md:col-start-auto">
                          <span>
                            أجابوا صح: <b className="font-en text-foreground">{Math.round(i.p * 100)}%</b>
                          </span>
                          <span className="h-1.5 overflow-hidden rounded-full bg-muted">
                            <span
                              className={cn("block h-full rounded-full", i.p < 0.5 ? "bg-destructive" : "bg-success")}
                              style={{ width: `${Math.round(i.p * 100)}%` }}
                            />
                          </span>
                          <span>
                            يميّز: <b className={cn("font-en", i.discrimination < 0.15 ? "text-destructive" : "text-foreground")}>{i.discrimination}</b>
                            {i.discrimination < 0.15 ? " (ضعيف)" : ""}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ol>
                </Panel>
              )}

              {lessons.length > 0 && (
                <Panel title="رأي الطلاب في الدروس" icon={ThumbsDown}>
                  <ul className="flex flex-col gap-2">
                    {lessons.map((l) => {
                      const bad = l.votes >= 5 && l.share >= 0.3;
                      return (
                        <li key={l.lesson} className="grid grid-cols-[minmax(0,140px)_1fr_auto] items-center gap-3 text-sm">
                          <b className="truncate">{l.lesson}</b>
                          <span className="h-2 overflow-hidden rounded-full bg-muted">
                            <span
                              className={cn("block h-full rounded-full", bad ? "bg-accent" : "bg-success")}
                              style={{ width: `${Math.round((1 - l.share) * 100)}%` }}
                            />
                          </span>
                          <span className={cn("text-xs", bad ? "font-semibold text-warning" : "text-muted-foreground")}>
                            {Math.round(l.share * 100)}٪ «غير مفيد» من {l.votes}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </Panel>
              )}

              {isAdmin && note && (
                <Panel className="flex flex-wrap items-center gap-3 bg-ai-tint">
                  <IconTile icon={WandSparkles} tone="ai" />
                  <div className="min-w-[220px] flex-1">
                    <b>أرسلها للمصنع ليحسّنها</b>
                    <p className="text-sm whitespace-pre-line text-muted-foreground">{note}</p>
                  </div>
                  <ImproveUnitForm unitId={r.unit_id} note={note} />
                </Panel>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}
