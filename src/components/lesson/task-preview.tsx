import { Card } from "@/components/ui/card";
import { En } from "@/components/en";
import type { PackageLesson } from "@/lib/content/types";

/** Speaking / writing task description. AI evaluation arrives in phase 5. */
export function TaskPreview({ speaking, writing }: { speaking?: PackageLesson["speaking_task"] | null; writing?: PackageLesson["writing_task"] | null }) {
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
      <p className="text-sm leading-relaxed text-muted-foreground">
        التقييم الآلي {speaking ? "للمحادثة" : "للكتابة"} يُفتح قريباً. تدرّب الآن {speaking ? "بصوت عالٍ" : "على ورقة"}، ثم أكمل الدرس.
      </p>
    </Card>
  );
}
