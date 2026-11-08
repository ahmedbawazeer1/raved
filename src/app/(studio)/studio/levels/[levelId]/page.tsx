import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ApproveMapForm, MapUnitForm, PlanLevelForm } from "@/components/studio/forms";
import { requireStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { blocking, type MapIssue } from "@/lib/factory/curriculum";
import { BUILD_STATUS, MAP_STATUS } from "@/lib/factory/labels";
import { loadMap } from "@/lib/factory/load";
import { markMapReviewed } from "../../actions";

export const metadata: Metadata = { title: "خريطة المستوى" };

export default async function LevelMapPage({ params }: PageProps<"/studio/levels/[levelId]">) {
  const { levelId } = await params;
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

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          <Link href="/studio">المسارات والمناهج</Link> ← {path?.title} ← خريطة المستوى
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">
            خريطة المستوى <span dir="ltr">{level.code}</span> · {level.title}
          </h1>
          <Badge tone={st.tone}>{st.label}</Badge>
          {cl?.teacher_ok_at && <Badge tone="success">راجعها المعلم</Badge>}
        </div>
        <p className="max-w-3xl text-muted-foreground">
          تُخطط الخريطة مرة واحدة: الأهداف، تسلسل القواعد، وكل وحدة بموقفها وكلماتها. بعد اعتمادها يبني المصنع الوحدات واحدة واحدة بالترتيب.
        </p>
      </header>

      {status === "planning" && (
        <Card className="flex flex-col gap-2 border-ai/30 bg-ai-tint p-5">
          <p className="font-semibold text-ai">«عقل رفد» يخطط هذا المستوى ({job?.progress ?? 0}%)</p>
          {lastLog && <p className="text-sm">{lastLog}</p>}
          {job?.status === "failed" && <p className="text-sm text-destructive">توقف: {job.error}</p>}
          <p className="text-xs text-muted-foreground">يعمل الوكيل كل نصف ساعة. حدّث الصفحة لترى التقدم.</p>
        </Card>
      )}

      {!hasMap && status !== "planning" && (
        <Card className="flex flex-col gap-3 p-5">
          <h2 className="text-lg font-semibold">لا توجد خريطة لهذا المستوى بعد</h2>
          {isAdmin ? (
            <>
              <p className="text-sm text-muted-foreground">
                يقرأ الوكيل ملف المسار (لغة الفيديو، قائمة التشغيل إن وُجدت، قالب الوحدة) وما دُرّس في المستويات السابقة، ثم يخطط الخريطة على خطوات.
              </p>
              <PlanLevelForm levelId={level.id} again={false} />
            </>
          ) : (
            <p className="text-muted-foreground">يطلب المدير تخطيط المستوى، ثم تظهر الخريطة هنا لمراجعتك.</p>
          )}
        </Card>
      )}

      {hasMap && map && (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            {[
              ["الوحدات", units.length],
              ["الأهداف", map.objectives.length],
              ["القواعد", map.grammar.length],
              ["الكلمات الجديدة", wordCount],
            ].map(([label, n]) => (
              <Card key={label} className="p-4">
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold tabular-nums">{n}</p>
              </Card>
            ))}
          </div>

          {map.summary_ar && (
            <Card className="p-5">
              <h2 className="mb-1 text-lg font-semibold">ماذا يستطيع الطالب في نهاية المستوى</h2>
              <p>{map.summary_ar}</p>
            </Card>
          )}

          <Card className="flex flex-col gap-3 p-5">
            <h2 className="text-lg font-semibold">الفحص الآلي</h2>
            {issues.length === 0 ? (
              <p className="flex items-center gap-2 text-success">
                <CheckCircle2 className="size-5" aria-hidden="true" /> الخريطة سليمة: لا تكرار للكلمات، والأعداد مطابقة للقالب، وكل هدف وقاعدة مستخدمان.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {issues.map((i, k) => (
                  <li key={k} className="flex items-start gap-2 text-sm">
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
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-5">
              <h2 className="mb-2 text-lg font-semibold">الأهداف «أستطيع أن…»</h2>
              <ul className="flex flex-col gap-1 text-sm">
                {map.objectives.map((o) => (
                  <li key={o.code}>
                    <b dir="ltr">{o.code}</b> {o.text_ar}
                  </li>
                ))}
              </ul>
            </Card>
            <Card className="p-5">
              <h2 className="mb-2 text-lg font-semibold">تسلسل القواعد</h2>
              <ul className="flex flex-col gap-1 text-sm">
                {map.grammar.map((g) => (
                  <li key={g.code}>
                    <b dir="ltr">{g.code}</b> <span dir="ltr">{g.text_en}</span> — {g.text_ar}
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <Card className="flex flex-col gap-2 p-5">
            <h2 className="text-lg font-semibold">الوحدات</h2>
            <p className="text-sm text-muted-foreground">افتح أي وحدة لترى تفاصيلها وتعدّلها{locked ? " (الخريطة معتمدة: التعديل للمدير فقط)" : ""}.</p>
            {map.units.map((u) => {
              const row = units.find((r) => r.code === u.code)!;
              const bs = BUILD_STATUS[row.build_status] ?? BUILD_STATUS.planned;
              const unitIssues = issues.filter((i) => i.unit === u.code);
              return (
                <details key={u.code} className="rounded-xl border border-border open:bg-background">
                  <summary className="flex min-h-12 cursor-pointer flex-wrap items-center gap-3 px-4 py-2">
                    <b dir="ltr">{u.code}</b>
                    <span dir="ltr">{u.title_en}</span>
                    <span className="text-muted-foreground">{u.title_ar}</span>
                    <span className="text-sm text-muted-foreground">· {u.stop_ar}</span>
                    <span className="ms-auto flex items-center gap-2">
                      {unitIssues.some((i) => i.severity === "error") && <Badge tone="destructive">يحتاج إصلاحاً</Badge>}
                      {locked && <Badge tone={bs.tone}>{bs.label}</Badge>}
                      <span className="text-xs text-muted-foreground">{u.words.length} كلمة</span>
                    </span>
                  </summary>
                  <div className="flex flex-col gap-3 border-t border-border p-4">
                    {u.source_video && (
                      <p className="text-sm">
                        فيديو الوحدة من قائمة المستوى:{" "}
                        <a href={`https://www.youtube.com/watch?v=${u.source_video.youtube_id}`} target="_blank" rel="noreferrer" dir="ltr">
                          {u.source_video.title}
                        </a>
                      </p>
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
          </Card>

          {!locked && (
            <Card className="flex flex-col gap-4 p-5">
              <h2 className="text-lg font-semibold">القرار</h2>
              {!cl?.teacher_ok_at ? (
                <form action={markMapReviewed} className="flex flex-col gap-2">
                  <input type="hidden" name="level_id" value={level.id} />
                  <p className="text-sm text-muted-foreground">بعد مراجعة الكلمات والقواعد وترتيب الوحدات، علّم أنك راجعت الخريطة.</p>
                  <Button type="submit" variant="secondary" className="self-start">
                    راجعتُ الخريطة
                  </Button>
                </form>
              ) : (
                <p className="text-sm text-success">راجع المعلم الخريطة.</p>
              )}
              {isAdmin && (
                <>
                  <ApproveMapForm levelId={level.id} disabled={blocking(issues)} />
                  {blocking(issues) && <p className="text-sm text-muted-foreground">الاعتماد متاح بعد إصلاح الملاحظات الحمراء.</p>}
                  <details>
                    <summary className="cursor-pointer text-sm font-semibold">أو أعد تخطيط المستوى كاملاً بملاحظة</summary>
                    <div className="pt-3">
                      <PlanLevelForm levelId={level.id} again />
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
