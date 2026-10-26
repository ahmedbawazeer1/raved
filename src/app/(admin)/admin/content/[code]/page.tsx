import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Circle, PenLine } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { En } from "@/components/en";
import { MixedText } from "@/components/mixed-text";
import { CopyNotesButton, LessonReviewForm, PublishUnitForm } from "@/components/admin/unit-review";
import { createClient } from "@/lib/supabase/server";
import { formatBytes } from "@/lib/apply/compress";
import { validateUnitPackage } from "@/lib/content/validate";
import { SKILL_LABELS, type PackageQuestion } from "@/lib/content/types";
import { unpublishUnit } from "../actions";

export const metadata: Metadata = { title: "مراجعة وحدة" };

function answerText(q: PackageQuestion): string {
  if (Array.isArray(q.answer)) return q.answer.join(" ");
  if (typeof q.answer === "number") return q.options?.[q.answer] ?? String(q.answer);
  return String(q.answer);
}

export default async function UnitReviewPage({ params, searchParams }: PageProps<"/admin/content/[code]">) {
  const [{ code }, sp] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const { data: unit } = await supabase
    .from("units")
    .select("id, code, title, status, version, package_size_bytes, levels(code, paths(title)), lessons(id, position, title, skill, review_status, review_note, archived), quizzes(id, kind, pass_percent)")
    .eq("code", code)
    .maybeSingle();
  if (!unit) notFound();

  const lessons = (unit.lessons ?? []).filter((l) => !l.archived).sort((a, b) => a.position - b.position);
  const quiz = (unit.quizzes ?? []).find((q) => q.kind === "unit");
  const [{ data: key }, { data: pkgRow }] = await Promise.all([
    quiz ? supabase.from("quiz_keys").select("questions").eq("quiz_id", quiz.id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("unit_packages").select("package").eq("unit_id", unit.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const questions = ((key?.questions ?? []) as unknown as PackageQuestion[]) ?? [];
  const check = pkgRow ? validateUnitPackage(pkgRow.package) : null;

  const selectedId = typeof sp.lesson === "string" ? sp.lesson : lessons[0]?.id;
  const showQuiz = sp.lesson === "quiz";
  const selected = showQuiz ? undefined : lessons.find((l) => l.id === selectedId);
  const allApproved = lessons.length > 0 && lessons.every((l) => l.review_status === "approved");

  const notes = lessons
    .filter((l) => l.review_note)
    .map((l) => `- Lesson ${l.position} (${l.title}): ${l.review_note}`)
    .join("\n");
  const claudeText = `Unit to improve: ${unit.code}\nFeedback (pasted from the admin unit review):\n${notes || "- (no notes yet)"}`;

  return (
    <div className="flex flex-col gap-5">
      <Link href="/admin/content" className="text-sm">
        المحتوى / <En>{unit.code}</En>
      </Link>
      {sp.imported === "1" && <Alert tone="success">استُوردت الوحدة. راجع الدروس واعتمدها ثم انشر.</Alert>}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-bold">
            مراجعة: <En>{unit.title}</En>
          </h1>
          <p className="text-sm text-muted-foreground">
            {unit.levels?.paths?.title.split(":")[0]} · <En>{unit.levels?.code}</En> · الإصدار {unit.version}
            {unit.package_size_bytes ? ` · ${formatBytes(unit.package_size_bytes)} بدون فيديو` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-2.5">
          <CopyNotesButton text={claudeText} />
          {unit.status === "published" ? (
            <form action={unpublishUnit}>
              <input type="hidden" name="unit_id" value={unit.id} />
              <Button type="submit" variant="destructive">
                إلغاء النشر
              </Button>
            </form>
          ) : (
            <PublishUnitForm unitId={unit.id} ready={allApproved} />
          )}
        </div>
      </div>
      {unit.status === "published" && <Alert tone="success">الوحدة منشورة ومتاحة للطلاب.</Alert>}

      <div className="flex flex-wrap items-start gap-5">
        <Card className="w-full overflow-hidden md:max-w-[360px] md:flex-[1_1_300px]">
          {lessons.map((l) => {
            const active = l.id === selected?.id;
            return (
              <Link
                key={l.id}
                href={`/admin/content/${unit.code}?lesson=${l.id}`}
                aria-current={active ? "true" : undefined}
                className={`flex min-h-12 items-center gap-2.5 border-b border-muted px-4 py-2.5 text-sm text-foreground no-underline hover:text-foreground ${active ? "bg-primary-tint" : ""}`}
              >
                {l.review_status === "approved" ? (
                  <CheckCircle2 className="size-5 text-success" aria-hidden="true" />
                ) : l.review_status === "changes" ? (
                  <PenLine className="size-5 text-warning" aria-hidden="true" />
                ) : (
                  <Circle className="size-5 text-[#9AA8A4]" aria-hidden="true" />
                )}
                <span className="flex-1">
                  {SKILL_LABELS[l.skill as keyof typeof SKILL_LABELS] ?? l.skill}: <MixedText text={l.title} />
                </span>
                <Badge tone={l.review_status === "approved" ? "success" : l.review_status === "changes" ? "warning" : "muted"}>
                  {l.review_status === "approved" ? "معتمد" : l.review_status === "changes" ? "ملاحظة" : "للمراجعة"}
                </Badge>
              </Link>
            );
          })}
          {quiz && (
            <Link
              href={`/admin/content/${unit.code}?lesson=quiz`}
              className={`flex min-h-12 items-center gap-2.5 px-4 py-2.5 text-sm text-foreground no-underline hover:text-foreground ${showQuiz ? "bg-primary-tint" : ""}`}
            >
              <Circle className="size-5 text-[#9AA8A4]" aria-hidden="true" />
              <span className="flex-1">اختبار الوحدة ({questions.length} أسئلة)</span>
            </Link>
          )}
        </Card>

        <section className="flex w-full min-w-0 flex-col gap-4 md:flex-[999_1_460px]">
          {selected && (
            <>
              <Card className="flex flex-col gap-3 p-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold">
                    معاينة كطالب: <MixedText text={selected.title} />
                  </h2>
                  <Badge tone="muted">موبايل 390px</Badge>
                </div>
                <div className="mx-auto w-full max-w-[390px] overflow-hidden rounded-2xl border border-border">
                  <iframe src={`/preview/lesson/${selected.id}`} title="معاينة الدرس" className="h-[640px] w-full bg-background" />
                </div>
              </Card>
              <Card className="p-4">
                <LessonReviewForm key={selected.id} lessonId={selected.id} note={selected.review_note} status={selected.review_status} />
              </Card>
            </>
          )}
          {showQuiz && (
            <Card className="flex flex-col gap-1 p-4">
              <h2 className="mb-2 font-bold">أسئلة الاختبار (النجاح من {quiz?.pass_percent}%)</h2>
              {questions.map((q, i) => (
                <div key={q.id} className="border-b border-muted py-3 text-sm last:border-b-0">
                  <p className="font-semibold">
                    {i + 1}. <MixedText text={q.prompt} />
                  </p>
                  <p className="text-success">
                    الإجابة: <En>{answerText(q)}</En>
                  </p>
                  <p className="text-muted-foreground">
                    <MixedText text={q.explanation_ar} />
                  </p>
                </div>
              ))}
            </Card>
          )}
          {check && (check.warnings.length > 0 || check.errors.length > 0) && (
            <Card className="flex flex-col gap-1.5 p-4 text-sm">
              <p className="font-bold">ملاحظات الفحص</p>
              {[...check.errors, ...check.warnings].map((w, i) => (
                <p key={i} className={w.level === "error" ? "text-destructive" : "text-[#5C3D00]"}>
                  {w.message}
                </p>
              ))}
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}
