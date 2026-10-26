import { Sparkles } from "lucide-react";
import { En } from "@/components/en";

/** «تقديري» label required on every AI score (CLAUDE.md). */
export function EstimatePill({ cefr }: { cefr: string | null }) {
  return (
    <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-ai-tint px-3 text-xs font-semibold text-ai">
      <Sparkles className="size-3.5" aria-hidden="true" />
      تقديري{cefr ? <> · <En>{cefr}</En></> : null}
    </span>
  );
}

export function ScoreGrid({ scores }: { scores: { label: string; value: number }[] }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {scores.map((s) => (
        <div key={s.label} className="flex flex-col items-center gap-0.5 rounded-xl bg-card p-2 text-center">
          <En as="p" className="text-lg font-bold">
            {s.value}/5
          </En>
          <p className="text-xs text-muted-foreground">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

export function AiCard({ title, cefr, children }: { title: string; cefr: string | null; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-ai-tint bg-[#FAF7FF] p-4">
      <div className="flex items-center justify-between">
        <p className="font-bold">{title}</p>
        <EstimatePill cefr={cefr} />
      </div>
      {children}
    </section>
  );
}

export function AiFootnote({ model }: { model: string | null }) {
  return (
    <p className="text-xs leading-relaxed text-muted-foreground">
      التقييم تقديري من نموذج ذكاء اصطناعي{model ? <> (<En>{model}</En>)</> : null}، وقد يخطئ. هو للتدريب فقط وليس درجة امتحان.
    </p>
  );
}
