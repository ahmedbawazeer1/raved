import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { En } from "@/components/en";
import { AiCard, AiFootnote, ScoreGrid } from "@/components/practice/feedback-parts";
import { PracticeHeader } from "@/components/practice/practice-header";
import { SpeakButton } from "@/components/practice/speak-button";
import type { SpeakingFeedback } from "@/lib/ai/prompts/speaking";
import { requireActiveStudent } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "تقييم المحادثة" };

export default async function SpeakingResultPage(props: PageProps<"/student/practice/speaking/result/[attemptId]">) {
  const { attemptId } = await props.params;
  const { userId } = await requireActiveStudent();
  const supabase = await createClient();
  const { data: attempt } = await supabase
    .from("speaking_attempts")
    .select("id, lesson_id, prompt_en, transcript, duration_sec, feedback, estimated_cefr, model, lessons(title)")
    .eq("id", attemptId)
    .eq("student_id", userId)
    .maybeSingle();
  if (!attempt?.feedback) notFound();
  const f = attempt.feedback as unknown as SpeakingFeedback;

  return (
    <div className="flex flex-col">
      <PracticeHeader backHref="/student/practice" overline="تقييم المحادثة" title={attempt.lessons?.title ?? ""} />
      <main className="mx-auto flex w-full max-w-[640px] flex-col gap-3 p-4">
        <Card className="p-4">
          <En as="p" className="text-[15px] leading-relaxed font-semibold">
            {attempt.prompt_en}
          </En>
        </Card>
        <Card className="flex flex-col gap-1.5 p-4">
          <p className="text-[13px] text-muted-foreground">ما قلته · {attempt.duration_sec} ثانية · لم نحفظ الصوت</p>
          <En as="p" className="text-[15px] leading-relaxed">
            {attempt.transcript}
          </En>
        </Card>

        <AiCard title="التقييم" cefr={attempt.estimated_cefr}>
          <ScoreGrid
            scores={[
              { label: "المهمة", value: f.scores.task },
              { label: "الطلاقة", value: f.scores.fluency },
              { label: "القواعد", value: f.scores.grammar },
              { label: "المفردات", value: f.scores.vocabulary },
            ]}
          />
          <p className="text-[15px] leading-relaxed">👏 {f.strengths_ar}</p>
          {f.corrections.map((c, i) => (
            <div key={i} className="flex flex-col gap-1 rounded-xl bg-card p-3 text-sm">
              <p>
                <En className="text-destructive line-through">{c.wrong}</En> ← <En className="font-semibold text-success">{c.right}</En>
              </p>
              <p className="text-muted-foreground">{c.explanation_ar}</p>
            </div>
          ))}
          <p className="rounded-xl bg-warning-tint p-3 text-sm leading-relaxed">
            <b className="text-warning">نصيحة: </b>
            {f.tip_ar}
          </p>
        </AiCard>

        <Card className="flex flex-col gap-2 p-4">
          <p className="font-bold">نسخة محسّنة من كلامك</p>
          <En as="p" className="text-[15px] leading-relaxed">
            {f.improved_version}
          </En>
          <SpeakButton text={f.improved_version} label="استمع ثم كرّر بعده" />
        </Card>
        <AiFootnote model={attempt.model} />
      </main>
      <footer className="sticky bottom-[68px] border-t border-border bg-card px-4 py-3 md:bottom-0">
        <div className="mx-auto flex max-w-[640px] gap-2">
          <Button asChild variant="secondary" className="flex-1">
            <Link href={`/student/practice/speaking/${attempt.lesson_id}`}>سجّل مجدداً</Link>
          </Button>
          <Button asChild className="flex-1">
            <Link href="/student/practice">إلى التدريب</Link>
          </Button>
        </div>
      </footer>
    </div>
  );
}
