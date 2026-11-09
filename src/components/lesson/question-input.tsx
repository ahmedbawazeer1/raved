"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { calmMotion, fx } from "@/lib/fx";
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

  return <WordBank words={question.words ?? []} value={value} onChange={onChange} disabled={disabled} />;
}

/**
 * order_words: tap words to build the sentence, tap again to send them back. Each tile flies to its
 * place (FLIP) and leaves an empty slot in the bank, so the bank never jumps around.
 */
export function WordBank({ words, value, onChange, disabled }: { words: string[]; value: Answer; onChange: (value: Answer) => void; disabled?: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const before = useRef<Map<string, DOMRect>>(new Map());
  const chosen = Array.isArray(value) ? value : [];
  // Give every tile a stable id (its index in `words`) so it can be followed between the two rows.
  const used = new Set<number>();
  const chosenIds = chosen.map((w) => {
    const i = words.findIndex((x, k) => x === w && !used.has(k));
    used.add(i);
    return i;
  });
  const set = (ids: number[]) => {
    before.current = new Map(
      [...(box.current?.querySelectorAll<HTMLElement>("[data-tile]") ?? [])].map((el) => [el.dataset.tile ?? "", el.getBoundingClientRect()]),
    );
    fx("pop");
    onChange(ids.map((k) => words[k]));
  };
  useLayoutEffect(() => {
    if (!before.current.size || calmMotion()) return;
    box.current?.querySelectorAll<HTMLElement>("[data-tile]").forEach((el) => {
      const r0 = before.current.get(el.dataset.tile ?? "");
      if (!r0) return;
      const r1 = el.getBoundingClientRect();
      if (Math.abs(r0.left - r1.left) + Math.abs(r0.top - r1.top) < 2) return;
      gsap.fromTo(el, { x: r0.left - r1.left, y: r0.top - r1.top }, { x: 0, y: 0, duration: 0.4, ease: "back.out(1.3)" });
    });
    before.current = new Map();
  }, [value]);
  const tile =
    "min-h-11 rounded-xl rounded-es-sm border-2 border-border bg-card px-3.5 font-en text-[15px] shadow-[0_3px_0_var(--color-border)] active:translate-y-0.5";
  return (
    <div ref={box} className="flex flex-col gap-3">
      <div dir="ltr" aria-label="جملتك" className="flex min-h-[3.75rem] flex-wrap items-end gap-2 border-b-2 border-border pb-2">
        {chosen.length === 0 && (
          <span dir="rtl" className="text-sm text-muted-foreground">
            اضغط الكلمات بالترتيب
          </span>
        )}
        {chosenIds.map((k, i) => (
          <button key={k} data-tile={k} type="button" disabled={disabled} onClick={() => set(chosenIds.filter((_, j) => j !== i))} className={tile}>
            {words[k]}
          </button>
        ))}
      </div>
      <div dir="ltr" className="flex flex-wrap justify-center gap-2">
        {words.map((w, k) =>
          used.has(k) ? (
            <span key={k} aria-hidden="true" className="min-h-11 rounded-xl rounded-es-sm bg-muted px-3.5 font-en text-[15px] text-transparent select-none">
              {w}
            </span>
          ) : (
            <button key={k} data-tile={k} type="button" disabled={disabled} onClick={() => set([...chosenIds, k])} className={tile}>
              {w}
            </button>
          ),
        )}
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
