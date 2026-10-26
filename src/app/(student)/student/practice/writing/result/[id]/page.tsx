import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { En } from "@/components/en";
import { AiCard, AiFootnote, ScoreGrid } from "@/components/practice/feedback-parts";
import { EvaluateNowButton } from "@/components/practice/evaluate-now";
import { PracticeHeader } from "@/components/practice/practice-header";
import type { WritingFeedback } from "@/lib/ai/prompts/writing";
import { requireActiveStudent } from "@/lib/auth/session";
import { highlightErrors } from "@/lib/practice/text";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "تصحيح الكتابة" };

const LABELS: { key: keyof WritingFeedback["scores"]; label: string }[] = [
  { key: "task_achievement", label: "المهمة" },
  { key: "coherence", label: "الترابط" },
  { key: "vocabulary", label: "المفردات" },
  { key: "grammar", label: "القواعد" },
];

export default async function WritingResultPage(props: PageProps<"/student/practice/writing/result/[id]">) {
  const { id } = await props.params;
  const { userId } = await requireActiveStudent();
  const supabase = await createClient();
  const { data: sub } = await supabase
    .from("writing_submissions")
    .select("id, lesson_id, parent_id, version, prompt_en, text, word_count, status, feedback, estimated_cefr, model, lessons(title)")
    .eq("id", id)
    .eq("student_id", userId)
    .maybeSingle();
  if (!sub) notFound();
  const f = sub.feedback as unknown as WritingFeedback | null;
  const { data: parent } = sub.parent_id
    ? await supabase.from("writing_submissions").select("version, feedback").eq("id", sub.parent_id).eq("student_id", userId).maybeSingle()
    : { data: null };
  const parentFeedback = parent?.feedback as unknown as WritingFeedback | null;

  const { segments, found } = f ? highlightErrors(sub.text, f.errors) : { segments: [{ error: null, text: sub.text }], found: [] };

  return (
    <div className="flex flex-col">
      <PracticeHeader backHref="/student/practice" overline={`تصحيح الكتابة · النسخة ${sub.version}`} title={sub.lessons?.title ?? ""} />
      <main className="mx-auto flex w-full max-w-[640px] flex-col gap-3 p-4">
        <Card className="p-4">
          <En as="p" className="text-[15px] leading-relaxed font-semibold">
            {sub.prompt_en}
          </En>
        </Card>
        <Card className="flex flex-col gap-2 p-4">
          <div className="flex items-center justify-between">
            <p className="text-[13px] text-muted-foreground">ما كتبته</p>
            <Badge tone="muted">{sub.word_count} كلمة</Badge>
          </div>
          <p dir="ltr" lang="en" className="font-en text-[15px] leading-loose whitespace-pre-wrap">
            {segments.map((s, i) =>
              s.error === null ? (
                <span key={i}>{s.text}</span>
              ) : (
                <mark key={i} className={`rounded px-0.5 ${f?.errors[s.error]?.optional ? "bg-info-tint" : "bg-warning-tint"} text-foreground`}>
                  {s.text}
                  <sup className="ms-0.5 font-sans text-[11px] font-bold text-warning">{s.error + 1}</sup>
                </mark>
              ),
            )}
          </p>
        </Card>

        {sub.status !== "evaluated" || !f ? (
          <Card className="flex flex-col gap-3 p-4">
            <p className="font-bold">لم تُصحَّح بعد</p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              حفظنا كتابتك. التصحيح الآلي لم يتم بعد (قد يكون الحد اليومي انتهى، أو الخدمة متوقفة مؤقتاً).
            </p>
            <EvaluateNowButton submissionId={sub.id} />
          </Card>
        ) : (
          <>
            <AiCard title="التصحيح" cefr={sub.estimated_cefr}>
              <ScoreGrid scores={LABELS.map((l) => ({ label: l.label, value: f.scores[l.key] }))} />
              {f.errors.length === 0 && <p className="text-sm">لم نجد أخطاء مهمة. أحسنت!</p>}
              <ol className="flex flex-col gap-2">
                {f.errors.map((e, i) => (
                  <li key={i} className="flex gap-2 rounded-xl bg-card p-3 text-sm">
                    <span className="flex size-6 flex-none items-center justify-center rounded-full bg-warning-tint text-xs font-bold text-warning">{i + 1}</span>
                    <div className="flex flex-col gap-1">
                      <p>
                        <En className="text-destructive">{e.text}</En> ← <En className="font-semibold text-success">{e.correction}</En>
                        {e.optional && (
                          <Badge tone="info" className="ms-2">
                            اختياري
                          </Badge>
                        )}
                      </p>
                      <p className="text-muted-foreground">{e.explanation_ar}</p>
                      {!found[i] && <p className="text-xs text-muted-foreground">(لم نحدد مكانه في النص)</p>}
                    </div>
                  </li>
                ))}
              </ol>
              <p className="text-[15px] leading-relaxed">👏 {f.strengths_ar}</p>
              <p className="rounded-xl bg-warning-tint p-3 text-sm leading-relaxed">
                <b className="text-warning">الخطوة التالية: </b>
                {f.next_step_ar}
              </p>
            </AiCard>

            {parentFeedback && (
              <Card className="p-4">
                <p className="mb-2 font-bold">المقارنة مع النسخة {parent?.version}</p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-muted-foreground">
                      <th className="py-1 text-start font-medium">المعيار</th>
                      <th className="py-1 font-medium">قبل</th>
                      <th className="py-1 font-medium">بعد</th>
                    </tr>
                  </thead>
                  <tbody>
                    {LABELS.map((l) => {
                      const before = parentFeedback.scores[l.key];
                      const after = f.scores[l.key];
                      return (
                        <tr key={l.key} className="border-t border-muted">
                          <td className="py-1.5">{l.label}</td>
                          <td className="py-1.5 text-center font-en">{before}/5</td>
                          <td className={`py-1.5 text-center font-en font-semibold ${after > before ? "text-success" : ""}`}>
                            {after}/5{after > before ? " ↑" : ""}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Card>
            )}
            <AiFootnote model={sub.model} />
          </>
        )}
      </main>
      <footer className="sticky bottom-[76px] border-t border-border bg-card px-4 py-3 md:bottom-0">
        <div className="mx-auto flex max-w-[640px] gap-2">
          <Button asChild variant="secondary" className="flex-1">
            <Link href="/student/practice">إلى التدريب</Link>
          </Button>
          {f && (
            <Button asChild className="flex-[2]">
              <Link href={`/student/practice/writing/${sub.lesson_id}?from=${sub.id}`}>أعد الكتابة بالتصحيحات</Link>
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
