"use client";

import { X } from "lucide-react";
import { MixedText } from "@/components/mixed-text";
import { cn } from "@/lib/utils";

export type Answer = number | string | string[] | undefined;

export interface QuestionView {
  id: string;
  kind: "mcq" | "fill_blank" | "true_false" | "order_words";
  prompt: string;
  options?: string[] | null;
  /** order_words: the words to arrange (already shuffled). */
  words?: string[] | null;
}

const KEYS = ["أ", "ب", "ج", "د", "هـ"];

/** Answer controls shared by lesson exercises and quizzes. */
export function QuestionInput({
  question,
  value,
  onChange,
  disabled,
}: {
  question: QuestionView;
  value: Answer;
  onChange: (value: Answer) => void;
  disabled?: boolean;
}) {
  if (question.kind === "mcq" || question.kind === "true_false") {
    return (
      <div role="radiogroup" aria-label="الخيارات" className="flex flex-col gap-2.5">
        {(question.options ?? []).map((option, i) => {
          const checked = value === i;
          return (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={checked}
              disabled={disabled}
              onClick={() => onChange(i)}
              className={cn(
                "flex min-h-[52px] items-center gap-3 rounded-xl border bg-card px-3.5 py-2.5 text-start text-[15px] font-medium",
                checked ? "border-2 border-primary bg-primary-tint" : "border-input",
              )}
            >
              <span
                className={cn(
                  "flex size-7 flex-none items-center justify-center rounded-lg text-sm font-bold",
                  checked ? "bg-primary text-white" : "bg-muted text-subtle",
                )}
              >
                {KEYS[i] ?? i + 1}
              </span>
              <span className="flex-1">
                <MixedText text={option} />
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  if (question.kind === "fill_blank") {
    return (
      <input
        type="text"
        dir="ltr"
        lang="en"
        autoCapitalize="off"
        autoComplete="off"
        spellCheck={false}
        disabled={disabled}
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="اكتب الكلمة"
        aria-label="إجابتك"
        className="min-h-12 w-full rounded-xl border border-input bg-card px-3.5 font-en text-[16px] focus-visible:border-primary focus-visible:outline-none"
      />
    );
  }

  // order_words: tap words to build the sentence, tap again to remove.
  const chosen = Array.isArray(value) ? value : [];
  const remaining = [...(question.words ?? [])];
  for (const w of chosen) {
    const idx = remaining.indexOf(w);
    if (idx >= 0) remaining.splice(idx, 1);
  }
  return (
    <div className="flex flex-col gap-3">
      <div dir="ltr" aria-label="جملتك" className="flex min-h-14 flex-wrap items-center gap-2 rounded-xl border border-dashed border-input bg-card p-2.5">
        {chosen.length === 0 && <span dir="rtl" className="text-sm text-muted-foreground">اضغط الكلمات بالترتيب</span>}
        {chosen.map((w, i) => (
          <button
            key={`${w}-${i}`}
            type="button"
            disabled={disabled}
            onClick={() => onChange(chosen.filter((_, j) => j !== i))}
            className="inline-flex min-h-10 items-center gap-1 rounded-lg bg-primary px-3 font-en text-[15px] text-white"
          >
            {w}
            <X className="size-3.5" aria-hidden="true" />
          </button>
        ))}
      </div>
      <div dir="ltr" className="flex flex-wrap gap-2">
        {remaining.map((w, i) => (
          <button
            key={`${w}-${i}`}
            type="button"
            disabled={disabled}
            onClick={() => onChange([...chosen, w])}
            className="min-h-11 rounded-lg border border-input bg-card px-3.5 font-en text-[15px]"
          >
            {w}
          </button>
        ))}
      </div>
    </div>
  );
}

/** True when the student has given some answer. */
export function isAnswered(value: Answer): boolean {
  if (value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}
