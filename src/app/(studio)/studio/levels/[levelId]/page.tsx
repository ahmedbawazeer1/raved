import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  BadgeCheck,
  Bot,
  Check,
  CheckCircle2,
  CircleCheck,
  CircleDashed,
  Cog,
  FastForward,
  GraduationCap,
  Hourglass,
  List,
  Lock,
  Map as MapIcon,
  OctagonAlert,
  Route,
  Sigma,
  Target,
  User,
  Users,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { IconTile, Kpi, PageHead, Panel } from "@/components/console/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ApproveMapForm, MapUnitForm, PlanLevelForm } from "@/components/studio/forms";
import { requireStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { blocking, type MapIssue } from "@/lib/factory/curriculum";
import { BUILD_STATUS, MAP_STATUS } from "@/lib/factory/labels";
import { STATIONS, stationOf, type Owner, type StationKey } from "@/lib/factory/line";
import { loadMap } from "@/lib/factory/load";
import { buildAheadOn } from "@/lib/factory/next-unit";
import { cn } from "@/lib/utils";
import { markMapReviewed, setBuildAhead } from "../../actions";
import { buildNextUnit } from "../../units/actions";

export const metadata: Metadata = { title: "المستوى" };

const OWNER: Record<Owner, { label: string; icon: LucideIcon; cls: string }> = {
  factory: { label: "المصنع", icon: Bot, cls: "bg-ai-tint text-ai" },
  teacher: { label: "المعلم", icon: GraduationCap, cls: "bg-info-tint text-info" },
  admin: { label: "المدير", icon: User, cls: "bg-warning-tint text-warning" },
  students: { label: "الطلاب", icon: Users, cls: "bg-success-tint text-success" },
};

type Tab = "map" | "line" | "journey";

export default async function LevelPage({ params, searchParams }: PageProps<"/studio/levels/[levelId]">) {
  const { levelId } = await params;
  const sp = await searchParams;
  const { isAdmin } = await requireStaff();
  const supabase = await createClient();
  const { data: level } = await supabase.from("levels").select("id, code, title, description, path_id, paths(title, slug)").eq("id", levelId).maybeSingle();
  if (!level) notFound();
  const path = level.paths as unknown as { title: string; slug: string } | null;
  const { data: cl } = await supabase.from("curriculum_levels").select("*").eq("level_id", levelId).maybeSingle();
  const { data: job } = cl?.job_id
    ? await supabase.from("agent_jobs").select("status, progress, log, error").eq("id", cl.job_id).maybeSingle()
    : { data: null };
  const loaded = await loadMap(supabase, levelId);
  const map = loaded?.map;
  const units = loaded?.units ?? [];
  const issues = (Array.isArray(cl?.issues) ? cl.issues : []) as unknown as MapIssue[];
  const status = cl?.status ?? "none";
  const st = MAP_STATUS[status];
  const locked = status === "approved";
  const hasMap = units.length > 0;
  const lastLog = Array.isArray(job?.log) ? (job.log as { msg: string }[]).at(-1)?.msg : null;
  const wordCount = map?.units.reduce((n, u) => n + u.words.length, 0) ?? 0;

  const tab: Tab = sp.tab === "line" || sp.tab === "journey" || sp.tab === "map" ? sp.tab : locked ? "line" : "map";

  // The line: steps of the jobs building units now, and the build-ahead switch.
  const buildingJobs = units.filter((u) => u.build_status === "building" && u.build_job_id).map((u) => u.build_job_id!);
  const { data: jobs } = buildingJobs.length
    ? await supabase.from("agent_jobs").select("id, step, progress").in("id", buildingJobs)
    : { data: [] as { id: string; step: string | null; progress: number }[] };
  const stepOf = new Map((jobs ?? []).map((j) => [j.id, j]));
  const { data: aheadSetting } = isAdmin ? await supabase.from("settings").select("value").eq("key", "factory_build_ahead").maybeSingle() : { data: null };
  const ahead = buildAheadOn(aheadSetting?.value);
  const placed = units.map((u) => ({
    ...u,
    station: stationOf(u, u.build_job_id ? stepOf.get(u.build_job_id)?.step : null),
    progress: u.build_job_id ? stepOf.get(u.build_job_id)?.progress : undefined,
  }));
  const count = (k: StationKey) => placed.filter((u) => u.station === k).length;
  const inProgress = placed.filter((u) => !["planned", "published"].includes(u.station));

  const tabs: { key: Tab; label: string; icon: LucideIcon }[] = [
    { key: "map", label: "الخريطة", icon: MapIcon },
    { key: "line", label: "خط الإنتاج", icon: Route },
    { key: "journey", label: "رحلة المحطات", icon: CircleCheck },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHead
        crumbs={[{ label: "الاستوديو", href: "/studio" }, ...(path ? [{ label: path.title, href: `/studio/paths/${path.slug}` }] : [])]}
        title={
          <>
            المستوى <span dir="ltr">{level.code}</span> · {level.title}
          </>
        }
        sub={
          locked ? "الخريطة معتمدة. المصنع يبني الوحدات بالترتيب، وتراجعها هنا." : "تُرسم الخريطة مرة واحدة: الأهداف، تسلسل القواعد، وكل وحدة بموقفها وكلماتها."
        }
      >
        <div className="flex flex-wrap gap-1.5">
          <Badge tone={st.tone}>{st.label}</Badge>
          {cl?.teacher_ok_at && <Badge tone="success">راجعها المعلم</Badge>}
        </div>
      </PageHead>

      <nav aria-label="أقسام المستوى" className="flex gap-1 overflow-x-auto border-b border-border">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/studio/levels/${level.id}?tab=${t.key}`}
            aria-current={tab === t.key ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center gap-2 border-b-[3px] px-3.5 text-sm font-semibold whitespace-nowrap no-underline",
              tab === t.key ? "border-primary text-primary hover:text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <t.icon className="size-4" aria-hidden="true" /> {t.label}
          </Link>
        ))}
      </nav>

      {status === "planning" && (
        <Panel className="border-ai/30 bg-ai-tint">
          <p className="font-semibold text-ai">«عقل رفد» يرسم خريطة هذا المستوى ({job?.progress ?? 0}%)</p>
          <span className="my-2 block h-2 overflow-hidden rounded-full bg-card">
            <span className="block h-full rounded-full bg-ai" style={{ width: `${Math.max(4, job?.progress ?? 0)}%` }} />
          </span>
          {lastLog && <p className="text-sm">{lastLog}</p>}
          {job?.status === "failed" && <p className="text-sm text-destructive">توقف: {job.error}</p>}
          <p className="text-xs text-muted-foreground">يعمل الوكيل كل نصف ساعة. حدّث الصفحة لترى التقدم.</p>
        </Panel>
      )}

      {!hasMap && status !== "planning" && (
        <Panel title="لا توجد خريطة لهذا المستوى بعد" icon={MapIcon}>
          {isAdmin ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                يقرأ الوكيل ملف المسار (لغة الفيديو، قائمة التشغيل إن وُجدت، قالب الوحدة) وما دُرّس في المستويات السابقة، ثم يرسم الخريطة على خطوات.
              </p>
              <PlanLevelForm levelId={level.id} again={false} />
            </div>
          ) : (
            <p className="text-muted-foreground">يطلب المدير رسم الخريطة، ثم تظهر هنا لمراجعتك.</p>
          )}
        </Panel>
      )}

      {hasMap && map && tab === "map" && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi label="الوحدات" value={units.length} />
            <Kpi label="الأهداف" value={map.objectives.length} />
            <Kpi label="القواعد" value={map.grammar.length} />
            <Kpi label="الكلمات الجديدة" value={wordCount} />
          </div>

          {locked && (
            <Panel className="flex items-center gap-3">
              <IconTile icon={Lock} tone="ok" />
              <p className="text-sm text-muted-foreground">
                الخريطة معتمدة ومقفلة. {isAdmin ? "يمكنك تعديل وحدة لم تُبنَ بعد من قائمة الوحدات." : "التعديل للمدير فقط."}
              </p>
            </Panel>
          )}

          <Panel title="الفحص الآلي" icon={CheckCircle2}>
            {issues.length === 0 ? (
              <p className="flex items-center gap-2 text-success">
                <Check className="size-5" aria-hidden="true" /> الخريطة سليمة: لا تكرار للكلمات، والأعداد مطابقة للقالب، وكل هدف وقاعدة مستخدمان.
              </p>
            ) : (
              <ul className="grid gap-2 md:grid-cols-2">
                {issues.map((i, k) => (
                  <li
                    key={k}
                    className={cn("flex items-start gap-2 rounded-xl p-3 text-sm", i.severity === "error" ? "bg-destructive-tint" : "bg-warning-tint")}
                  >
                    {i.severity === "error" ? (
                      <XCircle className="mt-0.5 size-4 flex-none text-destructive" aria-label="يجب إصلاحه" />
                    ) : (
                      <AlertTriangle className="mt-0.5 size-4 flex-none text-warning" aria-label="تنبيه" />
                    )}
                    <span>
                      {i.unit && (
                        <b dir="ltr" className="me-1">
                          {i.unit}
                        </b>
                      )}
                      {i.message}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <div className="grid gap-5 md:grid-cols-2">
            <Panel title="بعد هذا المستوى يستطيع الطالب أن" icon={Target}>
              {map.summary_ar && <p className="mb-2 text-sm text-muted-foreground">{map.summary_ar}</p>}
              <ul className="flex flex-col gap-1.5 text-sm">
                {map.objectives.map((o) => (
                  <li key={o.code} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 flex-none text-success" aria-hidden="true" />
                    <span>{o.text_ar}</span>
                  </li>
                ))}
              </ul>
            </Panel>
            <Panel title="تسلسل القواعد" icon={Sigma}>
              <ol className="flex flex-wrap items-center gap-1.5">
                {map.grammar.map((g, k) => (
                  <li key={g.code} className="flex items-center gap-1.5">
                    {k > 0 && (
                      <span aria-hidden="true" className="text-muted-foreground">
                        ‹
                      </span>
                    )}
                    <span className="rounded-lg bg-info-tint px-2 py-1 text-[13px] font-semibold text-info" title={g.text_ar}>
                      <span dir="ltr">{g.text_en}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </Panel>
          </div>

          <Panel title={`الوحدات (${map.units.length})`} icon={List}>
            <p className="mb-2 text-sm text-muted-foreground">افتح أي وحدة لترى موقفها ومهمتها وكلماتها{locked && !isAdmin ? "." : " وتعدّلها."}</p>
            <div className="flex flex-col">
              {map.units.map((u) => {
                const row = units.find((r) => r.code === u.code)!;
                const bs = BUILD_STATUS[row.build_status] ?? BUILD_STATUS.planned;
                const unitIssues = issues.filter((i) => i.unit === u.code);
                return (
                  <details key={u.code} className="group border-b border-border last:border-b-0">
                    <summary className="grid min-h-14 cursor-pointer grid-cols-[56px_1fr_auto] items-center gap-3 py-2.5">
                      <b dir="ltr" className="font-en text-[13px] text-muted-foreground">
                        {u.code}
                      </b>
                      <span className="min-w-0">
                        <b dir="ltr" className="block truncate text-start font-en">
                          {u.title_en}
                        </b>
                        <span className="block truncate text-[13px] text-muted-foreground">
                          {u.title_ar} · {u.stop_ar} · {u.words.length} كلمة
                        </span>
                      </span>
                      <span className="flex items-center gap-2">
                        {unitIssues.some((i) => i.severity === "error") && <Badge tone="destructive">يحتاج إصلاحاً</Badge>}
                        {locked && <Badge tone={bs.tone}>{bs.label}</Badge>}
                      </span>
                    </summary>
                    <div className="flex flex-col gap-3 pb-4">
                      <p className="rounded-xl bg-muted p-3 text-sm">
                        <b>الموقف:</b> {u.situation_ar}
                        <br />
                        <b>المهمة:</b> {u.task_ar}
                      </p>
                      {u.source_video && (
                        <p className="text-sm">
                          فيديو الوحدة:{" "}
                          <a href={`https://www.youtube.com/watch?v=${u.source_video.youtube_id}`} target="_blank" rel="noreferrer" dir="ltr">
                            {u.source_video.title}
                          </a>
                        </p>
                      )}
                      {row.build_job_id && (
                        <Link href={`/studio/units/${row.id}`} className="self-start text-sm font-semibold">
                          {row.build_status === "review" ? "راجع الوحدة ←" : "افتح الوحدة ←"}
                        </Link>
                      )}
                      <MapUnitForm
                        locked={locked && !isAdmin}
                        unit={{
                          id: row.id,
                          code: u.code,
                          title_en: u.title_en,
                          title_ar: u.title_ar,
                          stop_ar: u.stop_ar,
                          situation_ar: u.situation_ar,
                          task_ar: u.task_ar,
                          objectives: u.objectives,
                          grammar: u.grammar,
                          review_words: u.review,
                          words: u.words,
                        }}
                      />
                    </div>
                  </details>
                );
              })}
            </div>
          </Panel>

          {!locked && (
            <div className="sticky bottom-24 z-10 flex flex-wrap items-center gap-3 rounded-[18px] border border-border bg-card p-3 shadow-[0_10px_30px_-12px_rgba(0,0,0,.35)] md:bottom-3">
              <span className="min-w-[180px] flex-1 text-sm">
                <b>{isAdmin ? "اعتمادك يبدأ البناء" : "راجعت الخريطة؟"}</b>{" "}
                <span className="text-muted-foreground">{isAdmin ? "· أول وحدة تُبنى بعد الاعتماد" : "· تصل للمدير ليعتمدها"}</span>
              </span>
              {!cl?.teacher_ok_at ? (
                <form action={markMapReviewed}>
                  <input type="hidden" name="level_id" value={level.id} />
                  <Button type="submit" variant="secondary">
                    <BadgeCheck className="size-4" aria-hidden="true" /> راجعتُ الخريطة
                  </Button>
                </form>
              ) : (
                <Badge tone="success">راجعها المعلم</Badge>
              )}
              {isAdmin && <ApproveMapForm levelId={level.id} disabled={blocking(issues)} />}
            </div>
          )}
          {!locked && isAdmin && (
            <Panel>
              {blocking(issues) && <p className="mb-2 text-sm text-muted-foreground">الاعتماد متاح بعد إصلاح الملاحظات الحمراء.</p>}
              <details>
                <summary className="cursor-pointer text-sm font-semibold">أو أرجع الخريطة لـ«عقل رفد» ليعيد رسمها بملاحظة</summary>
                <div className="pt-3">
                  <PlanLevelForm levelId={level.id} again />
                </div>
              </details>
            </Panel>
          )}
        </>
      )}

      {hasMap && tab === "line" && (
        <>
          {!locked ? (
            <Panel>
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <IconTile icon={MapIcon} tone="gold" size="lg" />
                <b>الخط فارغ</b>
                <p className="max-w-md text-sm text-muted-foreground">يبدأ المصنع أول وحدة بعد اعتماد الخريطة، وتراها هنا تتحرك محطة بعد محطة.</p>
                <Link href={`/studio/levels/${level.id}?tab=map`} className="font-semibold">
                  راجع الخريطة ←
                </Link>
              </div>
            </Panel>
          ) : (
            <>
              <Panel className="flex flex-wrap items-center gap-3 bg-[linear-gradient(135deg,var(--color-ai-tint),var(--color-card))]">
                <IconTile icon={FastForward} tone="ai" />
                <div className="min-w-[220px] flex-1">
                  <b>البناء للأمام: وحدة واحدة</b>
                  <p className="text-sm text-muted-foreground">
                    أثناء مراجعة وحدة يبني المصنع التي بعدها، والنشر يبقى بالترتيب. لا يبني أكثر من وحدة واحدة للأمام.
                  </p>
                </div>
                {isAdmin && (
                  <form action={setBuildAhead}>
                    <input type="hidden" name="on" value={ahead ? "0" : "1"} />
                    <input type="hidden" name="level_id" value={level.id} />
                    <Button type="submit" variant="secondary" size="sm" aria-pressed={ahead}>
                      {ahead ? "مفعّل · أوقفه" : "متوقف · فعّله"}
                    </Button>
                  </form>
                )}
              </Panel>

              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-7" role="list" aria-label="محطات الخط">
                {STATIONS.map((s) => {
                  const own = OWNER[s.owner];
                  const cards = placed.filter((u) => u.station === s.key || (s.key === "video" && u.station === "failed"));
                  const mine = (s.key === "admin" && isAdmin) || (s.key === "teacher" && !isAdmin);
                  return (
                    <div
                      key={s.key}
                      role="listitem"
                      className={cn("flex min-w-0 flex-col gap-2 rounded-2xl p-2.5", mine && cards.length ? "bg-warning-tint" : "bg-muted")}
                    >
                      <div className="flex flex-col gap-1 border-b border-dashed border-border pb-2">
                        <b className="text-[13.5px]">{s.title}</b>
                        <span className={cn("inline-flex items-center gap-1 self-start rounded-full px-2 text-[11.5px] font-semibold", own.cls)}>
                          <own.icon className="size-3" aria-hidden="true" /> {own.label}
                        </span>
                        <span className="text-[11.5px] text-muted-foreground">{s.hint}</span>
                      </div>
                      {s.key === "planned" ? (
                        <p className="rounded-xl bg-card p-2.5 text-[13px]">
                          <b className="font-en">{count("planned")}</b> وحدة
                          <span className="block text-xs text-muted-foreground">
                            {ahead ? "تُبنى التالية عندما تصل التي قبلها للمراجعة" : "تُبنى بعد نشر السابقة"}
                          </span>
                        </p>
                      ) : s.key === "published" ? (
                        <p className="rounded-xl bg-card p-2.5 text-[13px]">
                          <b className="font-en">{count("published")}</b> من <b className="font-en">{units.length}</b>
                        </p>
                      ) : cards.length === 0 ? (
                        <p className="rounded-xl border border-dashed border-border p-2 text-center text-xs text-muted-foreground">فارغة</p>
                      ) : (
                        cards.map((u) => (
                          <Link
                            key={u.id}
                            href={`/studio/units/${u.id}`}
                            className={cn(
                              "flex flex-col gap-0.5 rounded-xl border bg-card p-2.5 text-foreground no-underline hover:text-foreground",
                              u.station === "failed"
                                ? "border-destructive bg-destructive-tint"
                                : mine
                                  ? "border-accent"
                                  : inProgress.length > 1 && u.station !== "teacher" && u.station !== "admin"
                                    ? "border-dashed border-ai"
                                    : "border-border",
                            )}
                          >
                            <span className="font-en text-xs font-bold text-muted-foreground">{u.code}</span>
                            <b dir="ltr" className="truncate text-start font-en text-[13px]">
                              {u.title_en}
                            </b>
                            {u.station === "failed" ? (
                              <span className="flex items-center gap-1 text-xs text-destructive">
                                <OctagonAlert className="size-3" aria-hidden="true" /> تعثر البناء
                              </span>
                            ) : u.progress !== undefined && u.build_status === "building" ? (
                              <span className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                                <span className="block h-full rounded-full bg-ai" style={{ width: `${Math.max(4, u.progress)}%` }} />
                              </span>
                            ) : null}
                          </Link>
                        ))
                      )}
                    </div>
                  );
                })}
              </div>

              {isAdmin &&
                !units.some((u) => u.build_status === "building") &&
                units.some((u) => u.build_status === "planned" || u.build_status === "failed") && (
                  <Panel className="flex flex-wrap items-center gap-3">
                    <p className="min-w-[200px] flex-1 text-sm text-muted-foreground">
                      لا وحدة تُبنى الآن. يبدأ المصنع التالية وحده حسب القاعدة، أو ابدأها الآن (أو أعد التي تعثرت).
                    </p>
                    <form action={buildNextUnit}>
                      <input type="hidden" name="level_id" value={level.id} />
                      <Button type="submit">ابنِ الوحدة التالية</Button>
                    </form>
                  </Panel>
                )}
            </>
          )}
        </>
      )}

      {hasMap && map && tab === "journey" && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi label="منشورة" value={count("published")} />
            <Kpi label="في المراجعة" value={count("teacher") + count("admin")} />
            <Kpi label="يبنيها المصنع" value={count("video") + count("write") + count("qa") + count("failed")} />
            <Kpi label="مخططة" value={count("planned")} />
          </div>
          <Panel title="المحطات" icon={Route}>
            <ul className="mb-4 flex flex-wrap gap-4 text-[13px] text-muted-foreground" aria-label="المفتاح">
              <li className="flex items-center gap-1.5">
                <CircleCheck className="size-4 text-success" aria-hidden="true" /> منشورة
              </li>
              <li className="flex items-center gap-1.5">
                <Hourglass className="size-4 text-warning" aria-hidden="true" /> في المراجعة
              </li>
              <li className="flex items-center gap-1.5">
                <Cog className="size-4 text-ai" aria-hidden="true" /> تُبنى
              </li>
              <li className="flex items-center gap-1.5">
                <CircleDashed className="size-4" aria-hidden="true" /> مخططة
              </li>
            </ul>
            <ol className="grid grid-cols-5 gap-y-5 sm:grid-cols-7 lg:grid-cols-13">
              {map.units.map((u, i) => {
                const row = placed.find((r) => r.code === u.code)!;
                const kind =
                  row.station === "published"
                    ? "pub"
                    : row.station === "teacher" || row.station === "admin"
                      ? "rev"
                      : row.station === "planned"
                        ? "map"
                        : "bld";
                const Icon = { pub: CircleCheck, rev: Hourglass, bld: Cog, map: CircleDashed }[kind];
                const label = { pub: "منشورة", rev: "في المراجعة", bld: "تُبنى", map: "مخططة" }[kind];
                const dot = (
                  <>
                    <span
                      className={cn(
                        "relative flex size-10 items-center justify-center rounded-full font-en text-[13px] font-bold",
                        kind === "pub" && "bg-success text-white",
                        kind === "rev" && "bg-accent text-accent-foreground shadow-[0_0_0_5px_var(--color-warning-tint)]",
                        kind === "bld" && "bg-ai text-white shadow-[0_0_0_5px_var(--color-ai-tint)]",
                        kind === "map" && "border-2 border-border bg-card text-muted-foreground",
                      )}
                    >
                      {i + 1}
                      <span className="absolute -bottom-1 -end-1 flex size-[18px] items-center justify-center rounded-full bg-card text-foreground shadow">
                        <Icon className="size-3" aria-hidden="true" />
                      </span>
                    </span>
                    <span className="max-w-full truncate text-[11.5px] text-muted-foreground">{u.stop_ar}</span>
                  </>
                );
                return (
                  <li key={u.code} className="flex flex-col items-center gap-1" title={`${u.code} ${u.title_en} · ${label}`}>
                    {row.build_job_id ? (
                      <Link
                        href={`/studio/units/${row.id}`}
                        aria-label={`${u.code} ${u.title_en}، ${label}`}
                        className="flex flex-col items-center gap-1 no-underline"
                      >
                        {dot}
                      </Link>
                    ) : (
                      <span aria-label={`${u.code} ${u.title_en}، ${label}`} className="flex flex-col items-center gap-1">
                        {dot}
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </Panel>
        </>
      )}
    </div>
  );
}
