import Link from "next/link";
import { Mic, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { En } from "@/components/en";
import type { PackageLesson } from "@/lib/content/types";

/** Speaking / writing task of the lesson, with a link to do it (evaluated by AI). */
export function TaskPreview({
  lessonId,
  speaking,
  writing,
}: {
  lessonId: string;
  speaking?: PackageLesson["speaking_task"] | null;
  writing?: PackageLesson["writing_task"] | null;
}) {
  if (!speaking && !writing) return null;
  return (
    <Card className="flex flex-col gap-2 border-ai-tint p-4">
      <p className="text-xs font-semibold text-ai">{speaking ? "مهمة المحادثة" : "مهمة الكتابة"}</p>
      <En as="p" className="text-[17px] leading-relaxed font-semibold">
        {speaking?.prompt_en ?? writing?.prompt_en}
      </En>
      {speaking?.helpful_phrases?.length ? (
        <div className="flex flex-wrap gap-1.5" dir="ltr">
          {speaking.helpful_phrases.map((p) => (
            <span key={p} className="rounded-full bg-ai-tint px-3 py-1 font-en text-sm text-ai">
              {p}
            </span>
          ))}
        </div>
      ) : null}
      {writing && (
        <p className="text-sm text-muted-foreground">
          من {writing.min_words} إلى {writing.max_words} كلمة.
        </p>
      )}
      <Button asChild variant="secondary" className="self-start">
        <Link href={`/student/practice/${speaking ? "speaking" : "writing"}/${lessonId}`}>
          {speaking ? <Mic className="size-4" aria-hidden="true" /> : <PenLine className="size-4" aria-hidden="true" />}
          {speaking ? "سجّل إجابتك واحصل على تقييم" : "اكتب واحصل على تصحيح"}
        </Link>
      </Button>
    </Card>
  );
}
