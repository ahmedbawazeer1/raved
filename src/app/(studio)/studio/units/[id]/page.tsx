import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LessonBlocks } from "@/components/lesson/lesson-blocks";
import { PublishUnitForm, RebuildLessonForm, RejectUnitForm, SectionForm } from "@/components/studio/unit-review-forms";
import { requireStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { BUILD_STATUS } from "@/lib/factory/labels";
import { EDIT_HINTS, sectionToText, writtenSections } from "@/lib/factory/build/content";
import { parseProfile } from "@/lib/factory/profile";
import type { FactoryOutput } from "@/lib/agent/factory";
import { markUnitReviewed } from "../actions";

export const metadata: Metadata = { title: "مراجعة وحدة" };

export default async function UnitReviewPage({ params }: PageProps<"/studio/units/[id]">) {
  const { id } = await params;
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
  const blocking = issues.some((i) => i.severity === "error");
  const lastLog = Array.isArray(job?.log) ? (job.log as { msg: string }[]).at(-1)?.msg : null;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          <Link href="/studio">المسارات والمناهج</Link> ← <Link href={`/studio/levels/${unit.level_id}`}>خريطة {level?.code}</Link> ← {unit.code}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">
            <span dir="ltr">
              {unit.code} · {unit.title_en}
            </span>{" "}
            <span className="text-muted-foreground">{unit.title_ar}</span>
          </h1>
          <Badge tone={st.tone}>{st.label}</Badge>
          {unit.teacher_ok_at && <Badge tone="success">راجعها المعلم</Badge>}
        </div>
        <p className="text-muted-foreground">
          {unit.stop_ar} · {unit.situation_ar}
        </p>
      </header>

      {(unit.build_status === "building" || job?.status === "queued" || job?.status === "running") && (
        <Card className="flex flex-col gap-2 border-ai/30 bg-ai-tint p-5">
          <p className="font-semibold text-ai">المصنع يبني الوحدة ({job?.progress ?? 0}%)</p>
          {lastLog && <p className="text-sm">{lastLog}</p>}
          <p className="text-xs text-muted-foreground">يعمل «عقل رفد» كل نصف ساعة. حدّث الصفحة لترى التقدم.</p>
        </Card>
      )}
      {unit.build_status === "failed" && <Card className="p-5 text-destructive">تعثر البناء: {job?.error ?? "خطأ غير معروف"}. أعده من صفحة الخريطة.</Card>}

      {out && (
        <>
          <Card className="flex flex-col gap-3 p-5">
            <h2 className="text-lg font-semibold">الفحص الآلي والمراجع الآلي</h2>
            {issues.length === 0 ? (
              <p className="flex items-center gap-2 text-success">
                <CheckCircle2 className="size-5" aria-hidden="true" /> لا ملاحظات في الفحص الآلي.
              </p>
            ) : (
              <ul className="flex flex-col gap-1.5 text-sm">
                {issues.map((i, k) => (
                  <li key={k} className="flex items-start gap-2">
                    {i.severity === "error" ? (
                      <XCircle className="mt-0.5 size-4 flex-none text-destructive" aria-label="يجب إصلاحه" />
                    ) : (
                      <AlertTriangle className="mt-0.5 size-4 flex-none text-warning" aria-label="تنبيه" />
                    )}
                    <span>
                      {i.lesson ? <b className="me-1">الدرس {i.lesson}:</b> : null}
                      {i.message}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {out.factory.qa.critique && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-muted-foreground">
                      <th className="py-1 text-start font-semibold">الدرس</th>
                      {criteria.map((c) => (
                        <th key={c} className="px-1 py-1 text-center font-semibold">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {out.factory.qa.critique.lessons.map((l) => (
                      <tr key={l.position} className="border-t border-border">
                        <td className="py-1.5">{l.position}</td>
                        {criteria.map((c, k) => (
                          <td key={c} className={`text-center tabular-nums ${(l.scores[k] ?? 5) < 4 ? "font-bold text-warning" : ""}`}>
                            {l.scores[k] ?? "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-1 text-xs text-muted-foreground">
                  درجات تقديرية من المراجع الآلي (من 5).{out.factory.qa.rewritten.length ? ` أعيدت كتابة الدروس: ${out.factory.qa.rewritten.join("، ")}.` : ""}
                </p>
              </div>
            )}
          </Card>

          {out.package.lessons.map((lesson, i) => {
            const meta = out.factory.lessons[i];
            const problems = out.factory.qa.critique?.lessons.find((l) => l.position === i + 1)?.problems ?? [];
            return (
              <Card key={lesson.id} className="flex flex-col gap-4 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold">
                    الدرس {i + 1}: {lesson.title}
                  </h2>
                  <Badge tone="muted">{meta.template}</Badge>
                  {meta.video ? (
                    <a
                      href={`https://www.youtube.com/watch?v=${meta.video.youtube_id}&t=${meta.video.part.start_sec}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm"
                      dir="ltr"
                    >
                      {meta.video.title || meta.video.youtube_id} ({meta.video.part.start_sec}–{meta.video.part.end_sec}s)
                    </a>
                  ) : (
                    <Badge tone="destructive">يحتاج فيديو</Badge>
                  )}
                </div>
                {problems.length > 0 && (
                  <ul className="rounded-xl bg-warning-tint p-3 text-sm">
                    {problems.map((p, k) => (
                      <li key={k}>
                        <b dir="ltr">{p.section}</b>: {p.problem_ar}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="grid gap-5 lg:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-semibold text-muted-foreground">كما يراه الطالب</p>
                    <div className="rounded-2xl border border-border bg-background p-3">
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
                  <div className="flex flex-col gap-4">
                    <p className="text-sm font-semibold text-muted-foreground">عدّل النص مباشرة (التمارين تُولّد من جديد بعد الحفظ)</p>
                    {writtenSections(meta.spec).map((s) =>
                      meta.sections[s.key] ? (
                        <SectionForm
                          key={s.key}
                          unitId={unit.id}
                          lessonKey={meta.key}
                          sectionKey={s.key}
                          block={s.block}
                          title={s.title_ar}
                          text={sectionToText(meta.sections[s.key])}
                          hint={EDIT_HINTS[s.block]}
                          disabled={!inReview}
                        />
                      ) : null,
                    )}
                    {inReview && <RebuildLessonForm unitId={unit.id} lessonKey={meta.key} alternatives={meta.video?.alternatives ?? []} />}
                  </div>
                </div>
              </Card>
            );
          })}

          <Card className="flex flex-col gap-3 p-5">
            <h2 className="text-lg font-semibold">اختبار الوحدة ({out.package.quiz.questions.length} سؤالاً)</h2>
            <ol className="flex list-inside list-decimal flex-col gap-1 text-sm">
              {out.package.quiz.questions.map((q) => (
                <li key={q.id} dir="ltr" className="text-start">
                  {q.prompt} {q.options ? `(${q.options.join(" / ")})` : ""} →{" "}
                  <b>{Array.isArray(q.answer) ? q.answer.join(" ") : typeof q.answer === "number" ? q.options?.[q.answer] : q.answer}</b>
                </li>
              ))}
            </ol>
          </Card>

          {inReview && (
            <Card className="flex flex-col gap-4 p-5">
              <h2 className="text-lg font-semibold">القرار</h2>
              {!unit.teacher_ok_at ? (
                <form action={markUnitReviewed}>
                  <input type="hidden" name="unit_id" value={unit.id} />
                  <Button type="submit" variant="secondary">
                    راجعتُ الوحدة
                  </Button>
                </form>
              ) : (
                <p className="text-sm text-success">راجع المعلم الوحدة.</p>
              )}
              {isAdmin && (
                <>
                  <PublishUnitForm unitId={unit.id} disabled={blocking} />
                  {blocking && <p className="text-sm text-muted-foreground">النشر متاح بعد إصلاح الملاحظات الحمراء.</p>}
                  <details>
                    <summary className="cursor-pointer text-sm font-semibold">أو أعد بناء الوحدة كاملة بملاحظة</summary>
                    <div className="pt-3">
                      <RejectUnitForm unitId={unit.id} />
                    </div>
                  </details>
                </>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
}
