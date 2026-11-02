import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { En } from "@/components/en";
import { MixedText } from "@/components/mixed-text";
import { LessonBlocks } from "@/components/lesson/lesson-blocks";
import { SKILL_LABELS, type UnitPackage } from "@/lib/content/types";
import type { Timeline } from "@/lib/agent/unit";

interface BuiltOutput {
  package: UnitPackage;
  video: { id: string; title: string; channel: string; durationSec: number; reason_ar?: string };
  timeline: Timeline;
}

function mmss(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

/** What the agent built for one unit, shown for the owner's review (lessons in a phone frame). */
export function BuiltUnitReview({ output }: { output: unknown }) {
  const out = output as BuiltOutput;
  if (!out?.package?.lessons) return null;
  const pkg = out.package;
  const words = pkg.vocab.map((v) => ({ id: v.id, word: v.word, meaning: v.meaning_ar, example: v.example_en }));
  return (
    <section className="flex flex-col gap-4" aria-label="الوحدة المقترحة">
      <Card className="flex flex-col gap-2 p-5">
        <h2 className="text-lg font-bold">
          <En>{pkg.code}</En> · <En>{pkg.title}</En> · {pkg.stop_ar}
        </h2>
        <p className="text-sm text-muted-foreground">
          {pkg.lessons.length} دروس · {pkg.vocab.length} كلمة · {pkg.quiz.questions.length} سؤالاً في اختبار الوحدة · القاعدة: <En>{pkg.grammar_point}</En>
        </p>
      </Card>

      <Card className="flex flex-col gap-2 p-5">
        <h3 className="font-bold">الفيديو الذي اختاره</h3>
        <a href={`https://www.youtube.com/watch?v=${out.video.id}`} target="_blank" rel="noopener noreferrer" className="font-semibold">
          <En>{out.video.title}</En> · {out.video.channel} · <En>{mmss(out.video.durationSec)}</En>
        </a>
        {out.video.reason_ar && <p className="text-sm text-muted-foreground">لماذا: {out.video.reason_ar}</p>}
        <details className="text-sm">
          <summary className="min-h-10 font-semibold">ماذا يقال في كل دقيقة ({out.timeline.segments.length} مقاطع)</summary>
          <ol className="flex flex-col gap-1 pt-2">
            {out.timeline.segments.map((seg) => (
              <li key={seg.start_sec}>
                <En className="text-xs text-muted-foreground">
                  {mmss(seg.start_sec)}–{mmss(seg.end_sec)}
                </En>{" "}
                <En>{seg.what_happens_en}</En>
              </li>
            ))}
          </ol>
        </details>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {pkg.lessons.map((lesson) => (
          <div key={lesson.id} className="mx-auto w-full max-w-[400px] rounded-[2rem] border-8 border-foreground bg-background p-3">
            <p className="text-xs font-semibold text-muted-foreground">
              الدرس {lesson.position} · {SKILL_LABELS[lesson.skill]}
            </p>
            <h3 className="mb-3 font-bold">
              <MixedText text={lesson.title} />
            </h3>
            <LessonBlocks blocks={lesson.blocks} words={words} />
            {lesson.speaking_task && (
              <p className="mt-3 rounded-xl bg-ai-tint p-3 text-sm">
                مهمة محادثة: <En>{lesson.speaking_task.prompt_en}</En>
              </p>
            )}
            {lesson.writing_task && (
              <p className="mt-3 rounded-xl bg-ai-tint p-3 text-sm">
                مهمة كتابة: <En>{lesson.writing_task.prompt_en}</En>
              </p>
            )}
          </div>
        ))}
      </div>

      <Card className="flex flex-col gap-2 p-5">
        <h3 className="font-bold">الكلمات</h3>
        <div className="flex flex-wrap gap-1.5">
          {pkg.vocab.map((v) => (
            <Badge key={v.id} tone="muted">
              <En>{v.word}</En> · {v.meaning_ar}
            </Badge>
          ))}
        </div>
      </Card>

      <Card className="flex flex-col gap-2 p-5">
        <h3 className="font-bold">اختبار الوحدة (الإجابات تظهر هنا لك فقط)</h3>
        <ol className="flex list-decimal flex-col gap-2 ps-5 text-sm">
          {pkg.quiz.questions.map((q) => (
            <li key={q.id}>
              <MixedText text={q.prompt} />
              <span className="block text-xs text-success">
                الإجابة: <En>{Array.isArray(q.answer) ? q.answer.join(" ") : typeof q.answer === "number" && q.options ? q.options[q.answer] : String(q.answer)}</En>
              </span>
            </li>
          ))}
        </ol>
      </Card>
    </section>
  );
}
