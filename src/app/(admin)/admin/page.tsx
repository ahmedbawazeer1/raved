import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  BadgeCheck,
  BarChart3,
  BookOpenCheck,
  Bot,
  Bug,
  Check,
  Factory,
  Flag,
  Gauge,
  Inbox,
  ListChecks,
  Lock,
  Map as MapIcon,
  OctagonAlert,
  Rocket,
  Trophy,
  UserPlus,
  Users,
  VideoOff,
} from "lucide-react";
import { ActionRow, Empty, IconTile, Kpi, Panel, deltaOf, type Tone } from "@/components/console/ui";
import { En } from "@/components/en";
import { daysAgoIso } from "@/lib/admin/reports";
import { quotaStatus, yemenDay } from "@/lib/ai/limits";
import { loadConsoleSummary } from "@/lib/console/summary";
import { setupDone, setupSteps } from "@/lib/console/setup";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

/** Yemen midnight (UTC+3, no daylight saving) of a day offset from today. */
function yemenMidnight(offsetDays: number): string {
  const d = new Date(`${yemenDay()}T00:00:00+03:00`);
  return new Date(d.getTime() + offsetDays * 86_400_000).toISOString();
}

const JOB_AR: Record<string, string> = {
  plan_level: "رسم خريطة",
  factory_unit: "بناء",
  factory_lesson: "إعادة بناء درس",
  plan_path: "تصميم مسار",
  improve_unit: "تحسين",
};
const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 60) return `قبل ${Math.max(1, m)} د`;
  const h = Math.round(m / 60);
  if (h < 24) return `قبل ${h} س`;
  return `قبل ${Math.round(h / 24)} يوم`;
};

export default async function AdminTodayPage() {
  const supabase = await createClient();
  const summary = await loadConsoleSummary(true);
  const week = daysAgoIso(7);
  const twoWeeks = daysAgoIso(14);
  const today = yemenMidnight(0);
  const yesterday = yemenMidnight(-1);

  const [active, studied, lessons, quizzes, cunits, levels, paths, teachers, jobs, apps, reports, quotas] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "active").eq("role", "student"),
    supabase.from("lesson_progress").select("student_id, completed_at").gte("completed_at", twoWeeks),
    supabase.from("lesson_progress").select("id, completed_at").gte("completed_at", yesterday),
    supabase.from("quiz_attempts").select("passed, created_at").gte("created_at", twoWeeks),
    supabase.from("curriculum_units").select("build_status"),
    supabase.from("curriculum_levels").select("level_id, status"),
    supabase.from("paths").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "teacher"),
    supabase
      .from("agent_jobs")
      .select("id, kind, status, input, finished_at")
      .not("finished_at", "is", null)
      .order("finished_at", { ascending: false })
      .limit(5),
    supabase.from("applications").select("id, submitted_at").eq("status", "submitted").order("submitted_at", { ascending: false }).limit(3),
    supabase.from("reports").select("id, kind, created_at").order("created_at", { ascending: false }).limit(3),
    quotaStatus(),
  ]);

  // Numbers with context
  const studiedThis = new Set((studied.data ?? []).filter((r) => r.completed_at && r.completed_at >= week).map((r) => r.student_id)).size;
  const studiedLast = new Set((studied.data ?? []).filter((r) => r.completed_at && r.completed_at < week).map((r) => r.student_id)).size;
  const doneToday = (lessons.data ?? []).filter((r) => r.completed_at && r.completed_at >= today).length;
  const doneYesterday = (lessons.data ?? []).length - doneToday;
  const rate = (rows: { passed: boolean }[]) => (rows.length ? Math.round((rows.filter((r) => r.passed).length / rows.length) * 100) : null);
  const passThis = rate((quizzes.data ?? []).filter((q) => q.created_at >= week));
  const passLast = rate((quizzes.data ?? []).filter((q) => q.created_at < week));
  const build = { planned: 0, building: 0, review: 0, approved: 0, failed: 0 } as Record<string, number>;
  for (const u of cunits.data ?? []) build[u.build_status] = (build[u.build_status] ?? 0) + 1;
  const totalUnits = (cunits.data ?? []).length;

  const steps = setupSteps({
    paths: paths.count ?? 0,
    agentPaused: summary.agent.kind === "paused",
    mapsStarted: (levels.data ?? []).filter((l) => l.status !== "draft").length,
    mapsApproved: (levels.data ?? []).filter((l) => l.status === "approved").length,
    mapInReview: summary.mapsInReview[0]?.levelId ?? null,
    teachers: teachers.count ?? 0,
    unitsPublished: build.approved ?? 0,
  });
  const firstDay = (build.approved ?? 0) === 0;

  // «مطلوب منك»: most urgent first
  const ready = summary.unitsForAdmin.filter((u) => u.teacherOk);
  const queue: { href: string; icon: typeof Inbox; tone: Tone; title: React.ReactNode; detail: string; cta: string; urgent?: boolean }[] = [];
  for (const u of ready.slice(0, 2))
    queue.push({
      href: `/studio/units/${u.id}`,
      icon: BadgeCheck,
      tone: "gold",
      title: (
        <>
          {u.code} «{u.title}» جاهزة للنشر
        </>
      ),
      detail: "راجعها المعلم · تنتظر نشرك",
      cta: "راجع وانشر",
      urgent: true,
    });
  for (const m of summary.mapsInReview)
    queue.push({
      href: `/studio/levels/${m.levelId}`,
      icon: MapIcon,
      tone: "gold",
      title: <>خريطة {m.code} تنتظر اعتمادك</>,
      detail: m.teacherOk ? "راجعها المعلم" : "لم يراجعها معلم بعد",
      cta: "راجعها",
      urgent: true,
    });
  const waitingTeacher = summary.unitsForAdmin.filter((u) => !u.teacherOk);
  if (waitingTeacher.length)
    queue.push({
      href: "/studio/review",
      icon: BadgeCheck,
      tone: "blue",
      title: <>{waitingTeacher.length} وحدة عند المعلم</>,
      detail: "يمكنك مراجعتها بنفسك إن تأخر",
      cta: "اعرضها",
    });
  if (summary.pendingApplications)
    queue.push({
      href: "/admin/applications",
      icon: Inbox,
      tone: "blue",
      title: <>{summary.pendingApplications} طلبات التحاق جديدة</>,
      detail: "تنتظر قبولك أو رفضك",
      cta: "افتحها",
    });
  if (summary.openReports)
    queue.push({
      href: "/admin/reports",
      icon: Flag,
      tone: "red",
      title: <>{summary.openReports} بلاغات من الطلاب</>,
      detail: "من داخل الدروس",
      cta: "اعرضها",
    });
  if (summary.brokenVideos)
    queue.push({
      href: "/admin/reports#videos",
      icon: VideoOff,
      tone: "red",
      title: <>{summary.brokenVideos} فيديو معطّل</>,
      detail: "اكتُشف في الفحص الأسبوعي",
      cta: "اعرضها",
    });
  if (summary.openErrors)
    queue.push({
      href: "/admin/reports#errors",
      icon: Bug,
      tone: "red",
      title: <>{summary.openErrors} أخطاء ظهرت للطلاب</>,
      detail: "أرسل لي نصها إن تكررت",
      cta: "اعرضها",
    });

  // «آخر ما حدث»
  const feed = [
    ...(jobs.data ?? []).map((j) => {
      const code = String((j.input as Record<string, unknown> | null)?.unit_code ?? (j.input as Record<string, unknown> | null)?.level_code ?? "");
      const failed = j.status === "failed";
      return {
        at: j.finished_at!,
        icon: failed ? OctagonAlert : Bot,
        tone: (failed ? "red" : "ai") as Tone,
        title: failed ? `فشل ${JOB_AR[j.kind] ?? j.kind} ${code}` : `«عقل رفد» أنهى ${JOB_AR[j.kind] ?? j.kind} ${code}`,
      };
    }),
    ...(apps.data ?? []).filter((a) => a.submitted_at).map((a) => ({ at: a.submitted_at!, icon: UserPlus, tone: "blue" as Tone, title: "طلب التحاق جديد" })),
    ...(reports.data ?? []).map((r) => ({ at: r.created_at, icon: Flag, tone: "red" as Tone, title: "بلاغ من طالب" })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 6);

  const dateAr = new Intl.DateTimeFormat("ar", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Aden" }).format(new Date());
  const decisions = ready.length + summary.mapsInReview.length + summary.pendingApplications + summary.openReports;
  const agent = summary.agent;

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-[23px] font-bold">اليوم</h1>
        <p className="text-muted-foreground">
          {dateAr}
          {" · "}
          <b className="text-warning">{firstDay ? "لنجهّز المنصة معاً" : decisions ? `${decisions} أشياء تنتظر قرارك` : "لا شيء ينتظرك الآن"}</b>
        </p>
      </header>

      {quotas
        .filter((q) => q.alert)
        .map((q) => (
          <Link
            key={q.provider}
            href="/admin/ai-review"
            className="flex items-center gap-3 rounded-2xl bg-warning-tint p-4 text-sm font-semibold text-warning no-underline"
          >
            <Gauge className="size-5 flex-none" aria-hidden="true" />
            استُهلك {q.percent}% من الحصة المجانية لـ <En>{q.provider}</En> اليوم ({q.requests} من {q.quota}). قد يتوقف التقييم الآلي قبل نهاية اليوم.
          </Link>
        ))}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          {firstDay && (
            <Panel
              title="تجهيز المنصة"
              icon={Rocket}
              action={
                <span className="rounded-full bg-success-tint px-2.5 py-0.5 text-sm font-semibold text-success">
                  {setupDone(steps)} من {steps.length}
                </span>
              }
            >
              <p className="mb-3 text-sm text-muted-foreground">
                المنصة جديدة. اتبع هذه الخطوات بالترتيب؛ كل خطوة تفتح التي بعدها. تختفي هذه القائمة بعد نشر أول وحدة.
              </p>
              <div className="mb-2 h-2 overflow-hidden rounded-full bg-muted">
                <span className="block h-full rounded-full bg-primary" style={{ width: `${(setupDone(steps) / steps.length) * 100}%` }} />
              </div>
              <ol className="flex flex-col">
                {steps.map((s, i) => (
                  <li
                    key={s.key}
                    className={cn(
                      "flex items-center gap-3 border-b border-dashed border-border py-2.5 last:border-b-0",
                      s.now && "rounded-xl border-b-0 bg-warning-tint px-2.5",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-7 flex-none items-center justify-center rounded-full border-2 font-en text-[13px] font-bold",
                        s.done ? "border-success bg-success text-white" : s.now ? "border-accent text-warning" : "border-border text-muted-foreground",
                      )}
                    >
                      {s.done ? <Check className="size-4" aria-hidden="true" /> : i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <b className={cn("block", s.done && "text-muted-foreground line-through")}>{s.title}</b>
                      {!s.done && s.hint && <span className="text-[13px] text-muted-foreground">{s.hint}</span>}
                    </span>
                    {!s.done &&
                      (s.now || s.anytime ? (
                        <Link
                          href={s.href}
                          className={cn(
                            "flex min-h-10 items-center gap-1 rounded-xl px-3 text-sm font-semibold no-underline",
                            s.now ? "bg-primary text-white hover:text-white" : "border border-input bg-card text-foreground",
                          )}
                        >
                          {s.now ? "ابدأ" : "أضف"}
                          <ArrowLeft className="size-4" aria-hidden="true" />
                        </Link>
                      ) : (
                        <Lock className="size-4 text-muted-foreground" aria-label="تُفتح بعد الخطوة السابقة" />
                      ))}
                  </li>
                ))}
              </ol>
            </Panel>
          )}

          <section className="flex flex-col gap-2.5">
            <h2 className="flex items-center gap-2 text-base font-bold">
              <ListChecks className="size-[18px]" aria-hidden="true" /> مطلوب منك
            </h2>
            {queue.length === 0 ? (
              <Panel>
                <Empty icon={Check} tone="ok" title="لا شيء ينتظرك الآن">
                  كل ما يحتاج قرارك يظهر هنا: وحدات للنشر، خرائط للاعتماد، طلبات التحاق، وبلاغات.
                </Empty>
              </Panel>
            ) : (
              queue.map((q, i) => <ActionRow key={i} {...q} />)
            )}
          </section>

          {!firstDay && (
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <Kpi
                label="درسوا هذا الأسبوع"
                value={studiedThis}
                icon={Users}
                tone="green"
                delta={deltaOf(studiedThis, studiedLast, "الأسبوع الماضي")}
                href="/admin/students"
              />
              <Kpi label="دروس مكتملة اليوم" value={doneToday} icon={BookOpenCheck} tone="blue" delta={deltaOf(doneToday, doneYesterday, "أمس")} />
              <Kpi
                label="نجاح الاختبارات"
                value={passThis === null ? "—" : `${passThis}%`}
                icon={Trophy}
                tone="gold"
                delta={passThis !== null && passLast !== null ? deltaOf(passThis, passLast, "الأسبوع الماضي") : undefined}
              />
              <Kpi label="طلاب نشطون" value={active.count ?? 0} icon={Users} tone="ok" href="/admin/students" />
            </div>
          )}

          <Panel
            title="مصنع المحتوى"
            icon={Factory}
            action={
              <Link href="/studio" className="flex items-center gap-1 text-sm font-semibold">
                الاستوديو <ArrowLeft className="size-4" aria-hidden="true" />
              </Link>
            }
          >
            {totalUnits === 0 ? (
              <p className="text-sm text-muted-foreground">لا وحدات بعد. تظهر هنا بعد اعتماد أول خريطة مستوى.</p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { k: "planned", l: "مخططة", href: "/studio" },
                    { k: "building", l: "يبنيها المصنع", href: "/admin/agent" },
                    { k: "review", l: "في المراجعة", href: "/studio/review" },
                    { k: "approved", l: "منشورة", href: "/studio" },
                  ].map((s) => (
                    <Link
                      key={s.k}
                      href={s.href}
                      className={cn(
                        "flex flex-col rounded-2xl p-3 text-foreground no-underline hover:text-foreground",
                        s.k === "review" && build.review ? "bg-warning-tint" : "bg-muted",
                      )}
                    >
                      <span className="font-en text-[22px] font-bold">{build[s.k] ?? 0}</span>
                      <span className="text-[13px] text-muted-foreground">{s.l}</span>
                    </Link>
                  ))}
                </div>
                {build.failed > 0 && (
                  <p className="mt-2 text-sm font-semibold text-destructive">{build.failed} وحدة فشل بناؤها، افتح «عقل رفد» لإعادة المحاولة.</p>
                )}
                <div className="mt-3 flex items-center gap-3 text-[13px] text-muted-foreground">
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <span className="block h-full rounded-full bg-primary" style={{ width: `${((build.approved ?? 0) / totalUnits) * 100}%` }} />
                  </span>
                  <span>
                    <b className="font-en">{build.approved ?? 0}</b> من <b className="font-en">{totalUnits}</b> منشورة
                  </span>
                </div>
              </>
            )}
          </Panel>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <Panel
            title="عقل رفد"
            icon={Bot}
            className={cn(agent.kind === "failed" ? "border-destructive" : "bg-[linear-gradient(160deg,var(--color-ai-tint),var(--color-card)_70%)]")}
            action={
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-[13px] font-semibold",
                  agent.kind === "running"
                    ? "bg-success-tint text-success"
                    : agent.kind === "failed"
                      ? "bg-destructive-tint text-destructive"
                      : agent.kind === "paused"
                        ? "bg-warning-tint text-warning"
                        : "bg-muted text-muted-foreground",
                )}
              >
                {agent.kind === "running" ? "يعمل" : agent.kind === "failed" ? "متوقف بخطأ" : agent.kind === "paused" ? "موقوف" : "ينتظر"}
              </span>
            }
          >
            {agent.kind === "running" ? (
              <div className="flex flex-col gap-2">
                <b>{agent.label}</b>
                <span className="h-2 overflow-hidden rounded-full bg-muted">
                  <span className="block h-full rounded-full bg-ai" style={{ width: `${Math.max(4, agent.progress)}%` }} />
                </span>
                {agent.step && <span className="text-[13px] text-muted-foreground">{agent.step}</span>}
              </div>
            ) : agent.kind === "failed" ? (
              <p className="text-sm">
                توقف أثناء <b>{agent.label}</b>. ما بُني محفوظ.
                {agent.error && (
                  <span className="mt-1 block truncate font-en text-xs text-muted-foreground" dir="ltr">
                    {agent.error}
                  </span>
                )}
              </p>
            ) : agent.kind === "paused" ? (
              <p className="text-sm text-muted-foreground">موقوف الآن، فلا يرسم خرائط ولا يبني وحدات. شغّله من صفحته.</p>
            ) : (
              <p className="text-sm text-muted-foreground">لا مهام الآن. يبدأ وحده عندما يكون هناك ما يبنيه.</p>
            )}
            <Link
              href="/admin/agent"
              className="mt-3 inline-flex min-h-10 items-center gap-1 rounded-xl border border-input bg-card px-3 text-sm font-semibold text-foreground no-underline"
            >
              التفاصيل <ArrowLeft className="size-4" aria-hidden="true" />
            </Link>
          </Panel>

          <Panel title="آخر ما حدث" icon={Activity}>
            {feed.length === 0 ? (
              <p className="text-sm text-muted-foreground">لا نشاط بعد.</p>
            ) : (
              <ul className="flex flex-col">
                {feed.map((f, i) => (
                  <li key={i} className="grid grid-cols-[34px_1fr_auto] items-center gap-2.5 border-b border-dashed border-border py-2.5 last:border-b-0">
                    <IconTile icon={f.icon} tone={f.tone} size="sm" />
                    <b className="min-w-0 text-sm">{f.title}</b>
                    <time dateTime={f.at} className="text-xs whitespace-nowrap text-muted-foreground">
                      {ago(f.at)}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Link
            href="/admin/reports"
            className="flex items-center gap-3 rounded-[18px] border border-border bg-card p-4 text-foreground no-underline hover:border-primary hover:text-foreground"
          >
            <IconTile icon={BarChart3} tone="blue" />
            <span className="flex-1">
              <b className="block">التقارير</b>
              <span className="text-[13px] text-muted-foreground">النشاط الأسبوعي، المحافظات، أين يتوقف الطلاب</span>
            </span>
            <ArrowLeft className="size-4 text-primary" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
