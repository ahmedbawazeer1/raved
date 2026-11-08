import { AlignRight, BookOpen, Ear, Gamepad2, Mic, MonitorPlay, PenLine, Puzzle, ScrollText, Table2, type LucideIcon } from "lucide-react";
import { TONE, type Tone } from "@/components/console/ui";
import { cn } from "@/lib/utils";

/** One section of a lesson template as a coloured chip with its icon (the template «flow»). */
export const BLOCK_LOOK: Record<string, { icon: LucideIcon; tone: Tone; label: string }> = {
  video: { icon: MonitorPlay, tone: "red", label: "فيديو" },
  text: { icon: AlignRight, tone: "blue", label: "شرح" },
  reading: { icon: BookOpen, tone: "blue", label: "قراءة" },
  audio: { icon: Ear, tone: "gold", label: "استماع" },
  table: { icon: Table2, tone: "blue", label: "جدول" },
  exercise: { icon: Puzzle, tone: "ai", label: "تمرين" },
  game: { icon: Gamepad2, tone: "ok", label: "لعبة" },
  story: { icon: ScrollText, tone: "gold", label: "قصة" },
  speaking_task: { icon: Mic, tone: "green", label: "محادثة" },
  writing_task: { icon: PenLine, tone: "green", label: "كتابة" },
};

export function BlockChip({ block, title }: { block: string; title: string }) {
  const look = BLOCK_LOOK[block] ?? BLOCK_LOOK.text!;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12.5px] font-semibold", TONE[look.tone])}>
      <look.icon className="size-3.5" aria-hidden="true" />
      {title}
    </span>
  );
}

export function BlockFlow({ sections }: { sections: { key: string; block: string; title_ar: string }[] }) {
  return (
    <ol className="flex flex-wrap items-center gap-1.5" aria-label="أقسام الدرس بالترتيب">
      {sections.map((s, i) => (
        <li key={s.key} className="flex items-center gap-1.5">
          {i > 0 && (
            <span aria-hidden="true" className="text-muted-foreground">
              ‹
            </span>
          )}
          <BlockChip block={s.block} title={s.title_ar} />
        </li>
      ))}
    </ol>
  );
}
