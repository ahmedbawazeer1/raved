import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, Bug, Check, CircleX, ExternalLink, Flag, MapPin, ThumbsDown, TrendingDown, VideoOff, type LucideIcon } from "lucide-react";
import { Empty, IconTile, PageHead, Panel, type Tone } from "@/components/console/ui";
import { SubmitButton } from "@/components/ui/submit-button";
import { En } from "@/components/en";
import { MixedText } from "@/components/mixed-text";
import { daysAgoIso, dropOffLessons, weeklyActive } from "@/lib/admin/reports";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { reopenReport, resolveAppError, resolveReport } from "../actions";

export const metadata: Metadata = { title: "البلاغات والتقارير" };

const KIND: Record<string, { label: string; icon: LucideIcon; tone: Tone }> = {
  error: { label: "خطأ في الدرس", icon: CircleX, tone: "gold" },
  not_useful: { label: "الدرس غير مفيد", icon: ThumbsDown, tone: "blue" },
  broken_link: { label: "الفيديو أو الرابط لا يعمل", icon: VideoOff, tone: "red" },
  feedback: { label: "ملاحظة من طالب", icon: Flag, tone: "blue" },
};

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const closed = (await searchParams).show === "closed";
  const supabase = await createClient();
  const since = daysAgoIso(8 * 7);
  const [
    { data: progress },
    { data: quizzes },
    { data: students },
    { data: governorates },
    { data: reports },
    { count: openCount },
    { data: lessons },
    { data: allProgress },
    { data: broken },
    { data: errors },
  ] = await Promise.all([
    supabase.from("lesson_progress").select("student_id, completed_at").gte("completed_at", since),
    supabase.from("quiz_attempts").select("student_id, created_at").gte("created_at", since),
    supabase.from("profiles").select("governorate").eq("role", "student").eq("status", "active"),
    supabase.from("governorates").select("code, name_ar"),
    supabase
      .from("reports")
      .select("id, kind, note, page, created_at, updated_at, lessons(id, title)")
      .eq("status", closed ? "resolved" : "open")
      .order(closed ? "updated_at" : "created_at", { ascending: false })
      .limit(50),
    supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase
      .from("lessons")
      .select("id, title, position, units!inner(position, status, levels!inner(position))")
      .eq("units.status", "published")
      .eq("archived", false),
    supabase.from("lesson_progress").select("student_id, lesson_id").eq("status", "completed"),
    supabase.from("sources").select("youtube_id, title, last_checked_at").eq("status", "broken").order("last_checked_at", { ascending: false }),
    supabase
      .from("app_errors")
      .select("id, source, message, digest, page, user_agent, created_at")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const weeks = weeklyActive(
    [
      ...(progress ?? []).map((p) => ({ student: p.student_id, at: p.completed_at })),
      ...(quizzes ?? []).map((q) => ({ student: q.student_id, at: q.created_at })),
    ],
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
  const govRows = [...byGov.entries()].sort((a, b) => b[1] - a[1]);
  const maxGov = Math.max(1, ...govRows.map((g) => g[1]));

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
      <PageHead title="البلاغات والتقارير" sub="ما أبلغ عنه الطلاب من داخل الدروس، وأخطاء المنصة، وصورة عامة عن النشاط." />

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="me-auto flex items-center gap-2 text-base font-bold">
            <Flag className="size-[18px]" aria-hidden="true" /> بلاغات الطلاب
          </h2>
          <nav aria-label="تصفية البلاغات" className="flex gap-1.5">
            <Link
              href="/admin/reports"
              aria-current={!closed ? "page" : undefined}
              className={cn(
                "min-h-10 rounded-full border px-4 py-2 text-sm font-semibold no-underline",
                !closed ? "border-foreground bg-foreground text-background hover:text-background" : "border-border bg-card text-foreground",
              )}
            >
              مفتوحة <span className="font-en">{openCount ?? 0}</span>
            </Link>
            <Link
              href="/admin/reports?show=closed"
              aria-current={closed ? "page" : undefined}
              className={cn(
                "min-h-10 rounded-full border px-4 py-2 text-sm font-semibold no-underline",
                closed ? "border-foreground bg-foreground text-background hover:text-background" : "border-border bg-card text-foreground",
              )}
            >
              أُغلقت
            </Link>
          </nav>
        </div>
        {(reports ?? []).length === 0 ? (
          <Panel>
            <Empty icon={Check} tone="ok" title={closed ? "لا بلاغات مغلقة بعد" : "لا بلاغات مفتوحة"}>
              زر «أبلغ عن مشكلة» موجود في كل درس، وما يرسله الطلاب يظهر هنا مع مكانه.
            </Empty>
          </Panel>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {reports!.map((r) => {
              const k = KIND[r.kind] ?? KIND.feedback!;
              return (
                <article key={r.id} className="flex flex-col gap-3 rounded-[18px] border border-border bg-card p-4">
                  <div className="flex items-center gap-3">
                    <IconTile icon={k.icon} tone={k.tone} />
                    <div className="min-w-0 flex-1">
                      <b className="block">{k.label}</b>
                      <span className="text-[13px] text-muted-foreground">
                        {new Date(closed ? r.updated_at : r.created_at).toLocaleDateString("ar", { day: "numeric", month: "long" })}
                      </span>
                    </div>
                    {closed && (
                      <span className="flex items-center gap-1 rounded-full bg-success-tint px-2.5 py-0.5 text-[13px] font-semibold text-success">
                        <Check className="size-3.5" aria-hidden="true" /> أُغلق
                      </span>
                    )}
                  </div>
                  {r.lessons && (
                    <span className="flex items-center gap-2 self-start rounded-xl bg-muted px-2.5 py-1.5 text-[13px]">
                      <MapPin className="size-4 text-muted-foreground" aria-hidden="true" />
                      <MixedText text={r.lessons.title} />
                    </span>
                  )}
                  {r.note && <p className="rounded-xl border-s-[3px] border-border bg-muted px-3 py-2 text-sm whitespace-pre-line">«{r.note}»</p>}
                  {r.page && !r.lessons && (
                    <En as="p" className="truncate text-xs text-muted-foreground">
                      {r.page}
                    </En>
                  )}
                  <div className="mt-auto grid grid-cols-2 gap-2">
                    {r.lessons ? (
                      <Link
                        href={`/preview/lesson/${r.lessons.id}`}
                        className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-input bg-card text-sm font-semibold text-foreground no-underline"
                      >
                        <ExternalLink className="size-4" aria-hidden="true" /> افتح الدرس
                      </Link>
                    ) : (
                      <span />
                    )}
                    <form action={closed ? reopenReport : resolveReport} className="contents">
                      <input type="hidden" name="report_id" value={r.id} />
                      <SubmitButton variant={closed ? "secondary" : "primary"} pendingLabel="…">
                        {closed ? "أعد فتحه" : "أُغلق"}
                      </SubmitButton>
                    </form>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel
          title="أخطاء المنصة"
          icon={Bug}
          className="scroll-mt-20"
          action={
            (errors ?? []).length > 0 ? (
              <form action={resolveAppError}>
                <input type="hidden" name="all" value="1" />
                <SubmitButton variant="secondary" size="sm" pendingLabel="…">
                  أُغلقت كلها
                </SubmitButton>
              </form>
            ) : undefined
          }
        >
          <span id="errors" />
          {(errors ?? []).length === 0 ? (
            <Empty icon={Check} tone="ok" title="لا أخطاء جديدة">
              أخطاء ظهرت للطلاب في المتصفح أو على الخادم (بلا بيانات شخصية).
            </Empty>
          ) : (
            <ul className="flex flex-col">
              {errors!.map((e) => (
                <li key={e.id} className="flex flex-wrap items-start gap-3 border-b border-dashed border-border py-3 text-sm last:border-b-0">
                  <div className="min-w-0 flex-1">
                    <b className="block">
                      {e.source === "server" ? "على الخادم" : "في المتصفح"} · {new Date(e.created_at).toLocaleString("ar")}
                    </b>
                    <En as="p" className="break-words text-muted-foreground">
                      {e.message}
                    </En>
                    <En as="p" className="truncate text-xs text-muted-foreground">
                      {[e.page, e.digest && `digest ${e.digest}`].filter(Boolean).join(" · ")}
                    </En>
                  </div>
                  <form action={resolveAppError}>
                    <input type="hidden" name="error_id" value={e.id} />
                    <SubmitButton variant="secondary" size="sm" pendingLabel="…">
                      أُغلق
                    </SubmitButton>
                  </form>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-muted-foreground">إذا تكرر خطأ، أرسل لي نصه لأصلحه.</p>
        </Panel>

        <Panel title="فيديوهات معطّلة" icon={VideoOff}>
          <span id="videos" className="block scroll-mt-20" />
          {(broken ?? []).length === 0 ? (
            <Empty icon={Check} tone="ok" title="كل الفيديوهات تعمل">
              تُفحص كل أسبوع تلقائياً.
            </Empty>
          ) : (
            <ul className="flex flex-col">
              {broken!.map((b) => (
                <li key={b.youtube_id} className="flex items-center justify-between gap-3 border-b border-dashed border-border py-2.5 text-sm last:border-b-0">
                  <span className="min-w-0">
                    <b className="block truncate">{b.title ? <MixedText text={b.title} /> : <En>{b.youtube_id}</En>}</b>
                    <En className="text-xs text-muted-foreground">{b.youtube_id}</En>
                  </span>
                  <span className="text-xs whitespace-nowrap text-muted-foreground">
                    {b.last_checked_at ? new Date(b.last_checked_at).toLocaleDateString("ar") : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="الطلاب النشطون أسبوعياً" icon={BarChart3}>
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
        </Panel>

        <Panel title="الطلاب حسب المحافظة" icon={MapPin}>
          {govRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا يوجد طلاب نشطون بعد.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {govRows.map(([name, n]) => (
                <li key={name} className="grid grid-cols-[96px_1fr_36px] items-center gap-2.5 py-1 text-sm">
                  <span className="truncate">{name}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-muted">
                    <span className="block h-full rounded-full bg-accent" style={{ width: `${(n / maxGov) * 100}%` }} />
                  </span>
                  <span className="text-end font-en font-semibold">{n}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="أين يتوقف الطلاب؟" icon={TrendingDown}>
        {drops.length === 0 ? (
          <p className="text-sm text-muted-foreground">لا توجد بيانات كافية بعد.</p>
        ) : (
          <ul className="flex flex-col">
            {drops.map((d) => (
              <li key={d.lessonId} className="flex items-center justify-between gap-3 border-b border-dashed border-border py-2.5 text-sm last:border-b-0">
                <MixedText text={d.title} />
                <span className="text-muted-foreground">
                  وصله {d.reached} وأكمله {d.completed}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
