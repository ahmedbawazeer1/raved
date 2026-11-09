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
import { BattleScene } from "@/components/art/battle-scene";
import { Celebrate } from "@/components/art/celebrate";
import { ShareStamp } from "@/components/art/share-stamp";
import { Stamp } from "@/components/art/stamp";
import { guardianFor } from "@/lib/art/guardians";
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

  const { data: quiz } = await supabase
    .from("quizzes")
    .select("pass_percent, units(id, title, position, levels(code, paths(slug)))")
    .eq("id", quizId)
    .maybeSingle();
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
  const guardian = guardianFor(unit?.levels?.code);
  const stopName = `الوحدة ${unit?.position ?? ""}`;
  const wrong = results.filter((r) => !r.correct);

  return (
    <>
      <TopBar backHref={unitHref} title={<>نتيجة اختبار الوحدة {unit?.position ?? ""}</>} />
      <main className="mx-auto flex w-full max-w-[640px] flex-col gap-4 px-4 py-5">
        <section aria-label="نتيجة المعركة" className="flex flex-col gap-2">
          <BattleScene guardian={guardian} hp={Math.max(0, 100 - attempt.score)} outcome={attempt.passed ? "won" : "lost"} />
          <p className="text-center font-bold">
            {attempt.passed ? `هزمت ${guardian.name} وعبرت السدّ!` : `${guardian.name} صمد هذه المرة`}
            <span className="block text-xs font-normal text-muted-foreground">
              {attempt.correct} ضربات صحيحة من {attempt.total}
            </span>
          </p>
        </section>

        {attempt.passed && unit && (
          <section aria-label="زهرة الوحدة" className="flex flex-col items-center gap-3 rounded-3xl border border-border bg-card p-4">
            <Celebrate id={attempt.id} />
            <Stamp name={stopName} position={unit.position} earned className="w-32 motion-safe:animate-[stamp-drop_.7s_cubic-bezier(.3,1.6,.5,1)]" />
            <p className="text-sm text-muted-foreground">أُضيفت إلى ألبوم وحداتك في «التقدم»</p>
            <ShareStamp name={stopName} position={unit.position} />
          </section>
        )}

        <Card className="flex items-center gap-4 p-5">
          <En className={`text-4xl font-bold ${attempt.passed ? "text-success" : "text-warning"}`}>
            {attempt.correct}/{attempt.total}
          </En>
          <div className="flex flex-col gap-1">
            <Badge tone={attempt.passed ? "success" : "warning"} className="self-start">
              {attempt.passed ? "نجحت" : "لم تنجح بعد"}
            </Badge>
            <p className="font-semibold">
              {attempt.passed ? `أحسنت يا ${profile.full_name.split(" ")[0]}!` : `تحتاج ${quiz?.pass_percent ?? 70}% للنجاح. راجع الأخطاء وحاول مرة أخرى.`}
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
