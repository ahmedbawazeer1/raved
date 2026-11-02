"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Companion } from "@/components/art/companion";
import { Alert } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { fx, prefsStore } from "@/lib/fx";
import { cn } from "@/lib/utils";

export interface WizardStep {
  key: string;
  title: string;
  /** What the companion says on this step. */
  hint: string;
  /** Form fields on this step (to jump back to the step of a server error). */
  fields: string[];
  content: React.ReactNode;
  /** Returns an error message when the step cannot be left yet. */
  check?: () => string | null;
}

/**
 * A form split into small steps, one per screen, with a progress bar and the companion.
 * Every step stays mounted (hidden ones too), so the whole form is submitted at the end and
 * the server validates everything again. `offset`/`total` number the steps across pages.
 */
export function Wizard({
  steps,
  offset = 0,
  total,
  backHref,
  submitLabel,
  pendingLabel,
  error,
  errorFields = [],
  footerNote,
}: {
  steps: WizardStep[];
  offset?: number;
  total: number;
  backHref: string;
  submitLabel: string;
  pendingLabel: string;
  error?: string;
  /** Fields the server rejected: the wizard opens the first step holding one of them. */
  errorFields?: string[];
  footerNote?: React.ReactNode;
}) {
  const prefs = useSyncExternalStore(prefsStore.subscribe, prefsStore.getSnapshot, prefsStore.getServerSnapshot);
  const [picked, setPicked] = useState(0);
  const [localError, setLocalError] = useState<string | null>(null);
  const [seenErrors, setSeenErrors] = useState<string[]>([]);
  // A new server error moves the student to the step that needs fixing (once per error set).
  const errorKey = errorFields.join(",");
  const errorStep = steps.findIndex((s) => s.fields.some((f) => errorFields.includes(f)));
  if (errorKey && errorKey !== seenErrors.join(",") && errorStep >= 0) {
    setSeenErrors(errorFields);
    setPicked(errorStep);
  }
  const index = picked;
  const step = steps[index];
  const last = index === steps.length - 1;
  const number = offset + index + 1;

  const go = (to: number) => {
    setLocalError(null);
    setPicked(to);
    fx("pop");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="flex flex-1 flex-col">
      <header className="relative overflow-hidden bg-[radial-gradient(120%_90%_at_85%_0%,#18A383_0%,#0E6E5C_45%,#08392F_100%)] px-4 pt-3 pb-5 text-white">
        <div className="mx-auto flex max-w-xl flex-col gap-3">
          <div className="flex items-center gap-2">
            {index > 0 ? (
              <button
                type="button"
                onClick={() => go(index - 1)}
                aria-label="الخطوة السابقة"
                className="flex size-11 items-center justify-center rounded-full bg-white/12"
              >
                <ArrowRight className="size-5" aria-hidden="true" />
              </button>
            ) : (
              <Link href={backHref} aria-label="رجوع" className="flex size-11 items-center justify-center rounded-full bg-white/12 text-white hover:text-white">
                <ArrowRight className="size-5" aria-hidden="true" />
              </Link>
            )}
            <p className="flex-1 text-sm text-primary-tint">
              الخطوة {number} من {total}
            </p>
          </div>
          <div className="flex gap-1" aria-hidden="true">
            {Array.from({ length: total }, (_, i) => (
              <span key={i} className={cn("h-2 flex-1 rounded-full transition-colors duration-300", i < number ? "bg-accent" : "bg-white/20")} />
            ))}
          </div>
          <div className="flex items-end gap-2">
            <Companion
              who={prefs.companion}
              headwear={prefs.headwear}
              hijab={prefs.hijab}
              mood={last ? "happy" : "idle"}
              wave={index === 0 || last}
              size={64}
            />
            <div className="mb-2 min-w-0 flex-1 rounded-2xl bg-white px-3.5 py-2.5 text-sm leading-relaxed font-semibold text-foreground shadow-lg">
              <h1 className="text-lg font-bold">{step.title}</h1>
              <p className="font-normal text-muted-foreground">{step.hint}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 p-4">
        {error && <Alert tone="error">{error}</Alert>}
        {steps.map((s, i) => (
          <section key={s.key} hidden={i !== index} aria-label={s.title} className="flex flex-col gap-4 motion-safe:animate-[rise-in_.3s]">
            {s.content}
          </section>
        ))}
        {localError && <Alert tone="error">{localError}</Alert>}
        {footerNote}
      </div>

      <footer className="sticky bottom-0 border-t border-border bg-card/95 px-4 pt-3 pb-5 backdrop-blur">
        <div className="mx-auto flex max-w-xl gap-2.5">
          {last ? (
            <SubmitButton
              className="min-h-13 flex-1 shadow-[0_5px_0_var(--color-primary-hover)] active:translate-y-[5px] active:shadow-none"
              pendingLabel={pendingLabel}
            >
              {submitLabel}
            </SubmitButton>
          ) : (
            <button
              type="button"
              onClick={() => {
                const problem = step.check?.() ?? null;
                if (problem) {
                  setLocalError(problem);
                  fx("bad");
                  return;
                }
                go(index + 1);
              }}
              className="flex min-h-13 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 font-semibold text-white shadow-[0_5px_0_var(--color-primary-hover)] active:translate-y-[5px] active:shadow-none"
            >
              التالي
              <ArrowLeft className="size-5" aria-hidden="true" />
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
