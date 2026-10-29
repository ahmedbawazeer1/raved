import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { En } from "@/components/en";
import { MixedText } from "@/components/mixed-text";
import { TopBar } from "@/components/student/top-bar";
import { requireActiveStudent } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getCurriculum, getPrimaryPath } from "@/lib/student/queries";

export const metadata: Metadata = { title: "نتيجة الاختبار" };

interface ResultItem {
  id: string;
  kind: string;
  skill: string | null;
  prompt: string;
  options: string[] | null;
  given: unknown;
  answer: unknown;
  correct: boolean;
  explanation_ar: string;
}

const SKILL: Record<string, string> = { vocab: "مفردات", grammar: "قواعد", listening: "استماع", reading: "قراءة" };

function show(kind: string, options: string[] | null, value: unknown): string {
  if (value === undefined || value === null || value === "") return "—";
  if ((kind === "mcq" || kind === "true_false") && typeof value === "number") return options?.[value] ?? "—";
  if (Array.isArray(value)) return value.join(" ");
  return String(value);
}

export default async function QuizResultPage({ params, searchParams }: PageProps<"/student/quiz/[quizId]/result">) {
  const [{ quizId }, sp] = await Promise.all([params, searchParams]);
  const { userId, profile } = await requireActiveStudent();
  const supabase = await createClient();

  let query = supabase.from("quiz_attempts").select("*").eq("quiz_id", quizId).eq("student_id", userId);
  query = typeof sp.attempt === "string" ? query.eq("id", sp.attempt) : query.order("created_at", { ascending: false }).limit(1);
  const { data: attempt } = await query.maybeSingle();
  if (!attempt) notFound();

  const { data: quiz } = await supabase.from("quizzes").select("pass_percent, units(id, title, position, stop_ar, levels(paths(slug)))").eq("id", quizId).maybeSingle();
  const unit = quiz?.units;
  const slug = unit?.levels?.paths?.slug ?? "";
  const unitHref = unit ? `/student/${slug}/unit/${unit.id}` : "/student";

  // Next unit, when this one is passed.
  let nextHref: string | null = null;
  if (attempt.passed) {
    const path = await getPrimaryPath(userId);
    if (path) {
      const curriculum = await getCurriculum(userId, path.id);
      const now = curriculum.units.find((u) => u.state === "now");
      if (now) nextHref = `/student/${path.slug}/unit/${now.id}`;
    }
  }
  const results = (attempt.results as unknown as ResultItem[]) ?? [];
  const wrong = results.filter((r) => !r.correct);

  return (
    <>
      <TopBar backHref={unitHref} title={<>نتيجة اختبار الوحدة {unit?.position ?? ""}</>} />
      <main className="mx-auto flex w-full max-w-[640px] flex-col gap-4 px-4 py-5">
        <section aria-label="نتيجة المعركة" className="flex flex-col gap-2 rounded-2xl bg-foreground p-4 text-white">
          <div className="flex items-center gap-3">
            <span className="text-4xl motion-safe:animate-[boss-hit_0.6s_ease-in-out_3]" aria-hidden="true">
              {attempt.passed ? "🏳️" : "🛡️"}
            </span>
            <div className="flex-1">
              <p className="font-bold">
                {attempt.passed ? `هزمت حارس ${unit?.stop_ar ?? "المحطة"}! ختم المحطة لك 🏅` : `حارس ${unit?.stop_ar ?? "المحطة"} صمد هذه المرة`}
              </p>
              <p className="text-xs text-white/70">
                {attempt.correct} ضربات صحيحة من {attempt.total}
              </p>
            </div>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-white/20" role="img" aria-label={`صحة الحارس ${Math.max(0, 100 - attempt.score)}%`}>
            <div
              className="h-full rounded-full bg-destructive motion-safe:animate-[boss-hp_1.6s_ease-out_forwards]"
              style={{ ["--hp" as string]: `${Math.max(0, 100 - attempt.score)}%`, width: `${Math.max(0, 100 - attempt.score)}%` }}
            />
          </div>
        </section>

        <Card className="flex items-center gap-4 p-5">
          <En className={`text-4xl font-bold ${attempt.passed ? "text-success" : "text-warning"}`}>
            {attempt.correct}/{attempt.total}
          </En>
          <div className="flex flex-col gap-1">
            <Badge tone={attempt.passed ? "success" : "warning"} className="self-start">
              {attempt.passed ? "نجحت" : "لم تنجح بعد"}
            </Badge>
            <p className="font-semibold">
              {attempt.passed
                ? `أحسنت يا ${profile.full_name.split(" ")[0]}!`
                : `تحتاج ${quiz?.pass_percent ?? 70}% للنجاح. راجع الأخطاء وحاول مرة أخرى.`}
            </p>
          </div>
        </Card>

        <Card className="px-4 py-1.5">
          {results.map((r) => (
            <div key={r.id} className="flex flex-col gap-1 border-b border-muted py-3 last:border-b-0">
              <div className="flex items-start gap-2.5">
                {r.correct ? (
                  <CheckCircle2 className="mt-0.5 size-5 flex-none text-success" aria-label="صحيحة" />
                ) : (
                  <XCircle className="mt-0.5 size-5 flex-none text-destructive" aria-label="خاطئة" />
                )}
                <span className="flex-1 text-[15px]">
                  <MixedText text={r.prompt} />
                </span>
                {r.skill && <span className="text-xs text-muted-foreground">{SKILL[r.skill] ?? r.skill}</span>}
              </div>
              {!r.correct && (
                <div className="ms-7 flex flex-col gap-1 text-sm">
                  <p>
                    إجابتك: <En className="text-destructive">{show(r.kind, r.options, r.given)}</En> · الصحيحة:{" "}
                    <En className="font-semibold text-success">{show(r.kind, r.options, r.answer)}</En>
                  </p>
                  <p className="leading-relaxed text-muted-foreground">
                    <MixedText text={r.explanation_ar} />
                  </p>
                </div>
              )}
            </div>
          ))}
        </Card>

        {attempt.passed && nextHref ? (
          <Button asChild>
            <Link href={nextHref}>الوحدة التالية</Link>
          </Button>
        ) : attempt.passed ? (
          <Button asChild>
            <Link href="/student">العودة لجلسة اليوم</Link>
          </Button>
        ) : (
          <Button asChild>
            <Link href={`/student/quiz/${quizId}`}>أعد الاختبار</Link>
          </Button>
        )}
        <Button asChild variant="secondary">
          <Link href={unitHref}>{wrong.length > 0 ? `راجع دروس الوحدة (${wrong.length} أخطاء)` : "صفحة الوحدة"}</Link>
        </Button>
      </main>
    </>
  );
}
