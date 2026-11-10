import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, BadgeCheck, Check, CircleHelp, MonitorPlay, OctagonAlert, Swords, XCircle } from "lucide-react";
import { IconTile, PageHead, Panel } from "@/components/console/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LessonBlocks } from "@/components/lesson/lesson-blocks";
import { PublishUnitForm, RebuildLessonForm, RejectUnitForm, SectionForm } from "@/components/studio/unit-review-forms";
import { requireStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { BUILD_STATUS } from "@/lib/factory/labels";
import { EDIT_HINTS, sectionToText, writtenSections } from "@/lib/factory/build/content";
import { parseProfile } from "@/lib/factory/profile";
import type { FactoryOutput } from "@/lib/agent/factory";
import { cn } from "@/lib/utils";
import { markUnitReviewed } from "../actions";

export const metadata: Metadata = { title: "مراجعة وحدة" };

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export default async function UnitReviewPage({ params, searchParams }: PageProps<"/studio/units/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const { isAdmin } = await requireStaff();
  const supabase = await createClient();
  const { data: unit } = await supabase.from("curriculum_units").select("*").eq("id", id).maybeSingle();
  if (!unit) notFound();
  const { data: level } = await supabase.from("levels").select("id, code, title, path_id").eq("id", unit.level_id).single();
  const { data: job } = unit.build_job_id
    ? await supabase.from("agent_jobs").select("id, kind, status, progress, log, error, output").eq("id", unit.build_job_id).maybeSingle()
    : { data: null };
  const { data: prof } = level ? await supabase.from("path_profiles").select("profile").eq("path_id", level.path_id).maybeSingle() : { data: null };
  const criteria = parseProfile(prof?.profile).quality.criteria;
  const out = job?.status === "needs_review" || job?.status === "approved" ? (job.output as unknown as FactoryOutput | null) : null;
  const st = BUILD_STATUS[unit.build_status] ?? BUILD_STATUS.planned;
  const inReview = job?.status === "needs_review" && Boolean(out);
  const issues = out?.factory.qa.issues ?? [];
  const blockingIssues = issues.some((i) => i.severity === "error");
  const lastLog = Array.isArray(job?.log) ? (job.log as { msg: string }[]).at(-1)?.msg : null;

  const lessons = out?.package.lessons ?? [];
  const tabRaw = typeof sp.lesson === "string" ? sp.lesson : "";
  const tab: number | "quiz" = tabRaw === "quiz" ? "quiz" : Math.min(Math.max(1, Number(tabRaw) || firstFlagged()), Math.max(1, lessons.length));
  function problemsOf(n: number) {
    return out?.factory.qa.critique?.lessons.find((l) => l.position === n)?.problems ?? [];
  }
  function flagged(n: number) {
    return issues.some((i) => i.lesson === n) || problemsOf(n).length > 0 || !out?.factory.lessons[n - 1]?.video;
  }
  function firstFlagged() {
    for (let n = 1; n <= lessons.length; n++) if (flagged(n)) return n;
    return 1;
  }
  const scores = out?.factory.qa.critique?.lessons.flatMap((l) => l.scores) ?? [];
  const score = scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length / 5) * 100) : null;
  const href = (t: number | "quiz") => `/studio/units/${unit.id}?lesson=${t}`;

  return (
    <div className="flex flex-col gap-5">
      <PageHead
        crumbs={[
          { label: "الاستوديو", href: "/studio" },
          { label: `${level?.code ?? ""} · خط الإنتاج`, href: `/studio/levels/${unit.level_id}?tab=line` },
        ]}
        title={
          <>
            <span dir="ltr" className="font-en">
              {unit.code} · {unit.title_en}
            </span>{" "}
            <span className="text-muted-foreground">{unit.title_ar}</span>
          </>
        }
        sub={`${unit.stop_ar} · ${unit.situation_ar}`}
      >
        <div className="flex flex-wrap gap-1.5">
          <Badge tone={st.tone}>{st.label}</Badge>
          {unit.teacher_ok_at && <Badge tone="success">راجعها المعلم</Badge>}
        </div>
      </PageHead>

      {(unit.build_status === "building" || job?.status === "queued" || job?.status === "running") && (
        <Panel className="border-ai/30 bg-ai-tint">
          <p className="font-semibold text-ai">المصنع يبني الوحدة ({job?.progress ?? 0}%)</p>
          <span className="my-2 block h-2 overflow-hidden rounded-full bg-card">
            <span className="block h-full rounded-full bg-ai" style={{ width: `${Math.max(4, job?.progress ?? 0)}%` }} />
          </span>
          {lastLog && <p className="text-sm">{lastLog}</p>}
          <p className="text-xs text-muted-foreground">يبدأ «عقل رفد» خلال دقائق. حدّث الصفحة لترى التقدم.</p>
        </Panel>
      )}
      {unit.build_status === "failed" && (
        <Panel className="border-destructive">
          <p className="flex items-center gap-2 font-semibold text-destructive">
            <OctagonAlert className="size-5" aria-hidden="true" /> تعثر البناء
          </p>
          <p className="mt-1 text-sm">{job?.error ?? "خطأ غير معروف"}</p>
          <Link href={`/studio/levels/${unit.level_id}?tab=line`} className="mt-2 inline-block text-sm font-semibold">
            أعده من خط الإنتاج ←
          </Link>
        </Panel>
      )}

      {out && (
        <>
          <section className="overflow-hidden rounded-[18px] border border-border bg-card" aria-label="نتيجة الفحص">
            <div className="flex flex-wrap items-center gap-4 p-4">
              {score !== null && (
                <span
                  className="flex size-16 flex-none items-center justify-center rounded-full"
                  style={{ background: `conic-gradient(var(--color-success) ${score}%, var(--color-muted) 0)` }}
                  role="img"
                  aria-label={`درجة المراجع الآلي ${score} من 100`}
                >
                  <span className="flex size-[50px] items-center justify-center rounded-full bg-card font-en text-[17px] font-bold">{score}</span>
                </span>
              )}
              <div className="min-w-[200px] flex-1">
                <b className="text-[16.5px]">نتيجة الفحص</b>
                <p className="text-sm text-muted-foreground">
                  {blockingIssues
                    ? "في الوحدة ملاحظات حمراء يجب إصلاحها قبل النشر."
                    : issues.length
                      ? "الفحص الآلي ناجح، مع ملاحظات صفراء لا تمنع النشر."
                      : "لا ملاحظات في الفحص الآلي."}{" "}
                  الدرجة تقديرية من المراجع الآلي.
                </p>
              </div>
            </div>
            {issues.length > 0 && (
              <ul className="grid gap-2.5 px-4 pb-4 md:grid-cols-2 lg:grid-cols-3">
                {issues.map((i, k) => {
                  const body = (
                    <>
                      <span className="flex items-center gap-1.5 font-bold">
                        {i.severity === "error" ? (
                          <XCircle className="size-4 flex-none" aria-hidden="true" />
                        ) : (
                          <AlertTriangle className="size-4 flex-none" aria-hidden="true" />
                        )}
                        {i.severity === "error" ? "يجب إصلاحه" : "تنبيه"}
                      </span>
                      <span className="text-[13.5px] text-foreground">{i.message}</span>
                      {i.lesson ? <span className="text-[12.5px] font-bold text-primary">الدرس {i.lesson} ←</span> : null}
                    </>
                  );
                  const cls = cn(
                    "flex h-full flex-col gap-1 rounded-2xl border p-3 text-start no-underline",
                    i.severity === "error" ? "border-destructive/30 bg-destructive-tint text-destructive" : "border-accent/40 bg-warning-tint text-warning",
                  );
                  return (
                    <li key={k}>
                      {i.lesson ? (
                        <Link href={href(i.lesson)} className={cls}>
                          {body}
                        </Link>
                      ) : (
                        <div className={cls}>{body}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <nav aria-label="دروس الوحدة" className="flex gap-2 overflow-x-auto pb-1">
            {lessons.map((l, i) => {
              const n = i + 1;
              const on = tab === n;
              return (
                <Link
                  key={l.id}
                  href={href(n)}
                  aria-current={on ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center gap-2 rounded-2xl border bg-card px-3 text-sm font-semibold whitespace-nowrap text-foreground no-underline hover:text-foreground",
                    on ? "border-primary shadow-[0_0_0_3px_var(--color-primary-tint)]" : "border-border",
                  )}
                >
                  {n}. {l.title}
                  <span className={cn("size-2.5 rounded-full", flagged(n) ? "bg-accent" : "bg-success")} aria-label={flagged(n) ? "فيه ملاحظة" : "سليم"} />
                </Link>
              );
            })}
            <Link
              href={href("quiz")}
              aria-current={tab === "quiz" ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-2 rounded-2xl border bg-card px-3 text-sm font-semibold whitespace-nowrap text-foreground no-underline hover:text-foreground",
                tab === "quiz" ? "border-primary shadow-[0_0_0_3px_var(--color-primary-tint)]" : "border-border",
              )}
            >
              <Swords className="size-4" aria-hidden="true" /> الاختبار
            </Link>
          </nav>

          {tab === "quiz" ? (
            <Panel title={`اختبار الوحدة (${out.package.quiz.questions.length} سؤالاً)`} icon={Swords}>
              <p className="mb-3 text-sm text-muted-foreground">الإجابات تظهر لك هنا فقط؛ لا تصل للطالب قبل التسليم.</p>
              <ol className="flex flex-col gap-2">
                {out.package.quiz.questions.map((q, k) => (
                  <li key={q.id} className="grid grid-cols-[32px_1fr] items-start gap-3 rounded-xl bg-muted p-3">
                    <span className="flex size-8 items-center justify-center rounded-lg bg-card font-en text-sm font-bold">{k + 1}</span>
                    <span dir="ltr" className="text-start font-en text-sm">
                      {q.prompt} {q.options ? `(${q.options.join(" / ")})` : ""}
                      <span className="mt-1 flex items-center gap-1 font-bold text-success">
                        <Check className="size-4" aria-hidden="true" />
                        {Array.isArray(q.answer) ? q.answer.join(" ") : typeof q.answer === "number" ? q.options?.[q.answer] : q.answer}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </Panel>
          ) : (
            (() => {
              const lesson = lessons[tab - 1]!;
              const meta = out.factory.lessons[tab - 1]!;
              const problems = problemsOf(tab);
              const crit = out.factory.qa.critique?.lessons.find((l) => l.position === tab);
              return (
                <div className="grid items-start gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
                  <div className="order-last mx-auto w-full max-w-[360px] lg:order-none lg:sticky lg:top-20">
                    <div className="rounded-[34px] border-[9px] border-foreground bg-background p-3" aria-label="كما يراه الطالب">
                      <p className="mb-2 flex justify-between text-xs text-muted-foreground">
                        <span>
                          الدرس {tab} من {lessons.length}
                        </span>
                        <span>معاينة الطالب</span>
                      </p>
                      <div className="max-h-[70vh] overflow-y-auto">
                        <LessonBlocks blocks={lesson.blocks} />
                        {lesson.speaking_task && (
                          <p className="mt-3 text-sm">
                            مهمة التحدث: <span dir="ltr">{lesson.speaking_task.prompt_en}</span>
                          </p>
                        )}
                        {lesson.writing_task && (
                          <p className="mt-1 text-sm">
                            مهمة الكتابة: <span dir="ltr">{lesson.writing_task.prompt_en}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex min-w-0 flex-col gap-3">
                    <section
                      className={cn("grid grid-cols-[40px_1fr] gap-3 rounded-2xl border bg-card p-4", meta.video ? "border-border" : "border-destructive")}
                    >
                      <IconTile icon={MonitorPlay} tone="red" />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <b>الفيديو</b>
                          <Badge tone="muted">إجباري</Badge>
                          {meta.video ? <Badge tone="success">مختار</Badge> : <Badge tone="destructive">يحتاج فيديو</Badge>}
                          {meta.video?.rating ? <Badge tone="ai">تقييم الوكيل {meta.video.rating}/5</Badge> : null}
                        </div>
                        {meta.video ? (
                          <p className="mt-1 text-sm text-muted-foreground">
                            <span dir="ltr">{meta.video.title || meta.video.youtube_id}</span> · من {mmss(meta.video.part.start_sec)} إلى{" "}
                            {mmss(meta.video.part.end_sec)}
                          </p>
                        ) : (
                          <p className="mt-1 text-sm text-destructive">لا يُنشر درس بلا فيديو. اختر فيديو مناسباً.</p>
                        )}
                        {inReview && (
                          <Button asChild variant="secondary" size="sm" className="mt-2">
                            <Link href={`/studio/units/${unit.id}/video?lesson=${tab}`}>
                              اختر فيديو آخر <ArrowLeft className="size-4" aria-hidden="true" />
                            </Link>
                          </Button>
                        )}
                      </div>
                    </section>

                    {(problems.length > 0 || crit) && (
                      <section className="rounded-2xl border border-accent/40 bg-warning-tint p-4">
                        <b className="flex items-center gap-2 text-warning">
                          <CircleHelp className="size-4" aria-hidden="true" /> ملاحظات المراجع الآلي على هذا الدرس
                        </b>
                        {crit && (
                          <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            {criteria.map((c, k) => (
                              <span key={c} className={cn((crit.scores[k] ?? 5) < 4 && "font-bold text-warning")}>
                                {c}: <b className="font-en">{crit.scores[k] ?? "—"}</b>/5
                              </span>
                            ))}
                          </p>
                        )}
                        {problems.length > 0 && (
                          <ul className="mt-2 flex flex-col gap-1 text-sm">
                            {problems.map((p, k) => (
                              <li key={k}>
                                <b dir="ltr">{p.section}</b>: {p.problem_ar}
                              </li>
                            ))}
                          </ul>
                        )}
                      </section>
                    )}

                    <p className="text-sm font-semibold text-muted-foreground">النصوص (عدّلها مباشرة؛ التمارين والألعاب تُولَّد من جديد في الكود بعد الحفظ)</p>
                    {writtenSections(meta.spec).map((s) =>
                      meta.sections[s.key] ? (
                        <section key={s.key} className="rounded-2xl border border-border bg-card p-4">
                          <SectionForm
                            unitId={unit.id}
                            lessonKey={meta.key}
                            sectionKey={s.key}
                            block={s.block}
                            title={s.title_ar}
                            text={sectionToText(meta.sections[s.key])}
                            hint={EDIT_HINTS[s.block]}
                            disabled={!inReview}
                          />
                        </section>
                      ) : null,
                    )}
                    {inReview && (
                      <details className="rounded-2xl border border-border bg-card p-4">
                        <summary className="cursor-pointer font-semibold">أعد بناء هذا الدرس فقط بملاحظة</summary>
                        <div className="pt-3">
                          <RebuildLessonForm unitId={unit.id} lessonKey={meta.key} alternatives={meta.video?.alternatives ?? []} />
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              );
            })()
          )}

          {inReview && (
            <div className="sticky bottom-24 z-10 flex flex-col gap-3 rounded-[18px] border border-border bg-card p-3 shadow-[0_10px_30px_-12px_rgba(0,0,0,.35)] md:bottom-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="min-w-[160px] flex-1 text-sm">
                  {blockingIssues ? (
                    <b className="text-destructive">ملاحظات حمراء تمنع النشر</b>
                  ) : issues.length ? (
                    <b className="text-warning">ملاحظات صفراء لا تمنع النشر</b>
                  ) : (
                    <b className="text-success">لا ملاحظات · جاهزة</b>
                  )}
                </span>
                {!unit.teacher_ok_at ? (
                  <form action={markUnitReviewed}>
                    <input type="hidden" name="unit_id" value={unit.id} />
                    <Button type="submit" variant={isAdmin ? "secondary" : "primary"}>
                      <BadgeCheck className="size-4" aria-hidden="true" /> راجعتُ الوحدة
                    </Button>
                  </form>
                ) : (
                  <Badge tone="success">راجعها المعلم</Badge>
                )}
                {isAdmin && <PublishUnitForm unitId={unit.id} disabled={blockingIssues} />}
              </div>
              {isAdmin && (
                <details>
                  <summary className="cursor-pointer text-sm font-semibold text-destructive">أرجع الوحدة كاملة للمصنع بملاحظة</summary>
                  <div className="pt-3">
                    <RejectUnitForm unitId={unit.id} />
                  </div>
                </details>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
