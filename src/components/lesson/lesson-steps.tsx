"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { ArrowLeft, ArrowRight, Check, Lock } from "lucide-react";
import { VIDEO_DONE, solvedStore } from "@/lib/gamification/events";
import { WaterBar } from "@/components/lesson/water-bar";
import { calmMotion, fx } from "@/lib/fx";
import { cn } from "@/lib/utils";

export interface LessonStep {
  key: string;
  title: string;
  icon: string;
  /** Exercise/game/story ids that must be solved before the next step opens. */
  requires: string[];
  /** The mandatory video: the next step opens once it is watched. */
  video?: boolean;
  content: React.ReactNode;
}

const stepKey = (lessonId: string) => `raved:lesson-step:${lessonId}`;
const noop = () => () => {};
function readSaved(lessonId: string): number {
  try {
    return Number(localStorage.getItem(stepKey(lessonId)) ?? 0) || 0;
  } catch {
    return 0;
  }
}

/**
 * The lesson as steps, one part per screen: the video, then each part on its own, and the finish.
 * A step opens when the one before it is done (video watched, exercises/game/story solved).
 * Once the lesson is completed every step stays open for review. The student's place is kept.
 */
export function LessonSteps({
  lessonId,
  steps,
  videoDone: initialVideoDone,
  completed,
  help,
}: {
  lessonId: string;
  steps: LessonStep[];
  videoDone: boolean;
  completed: boolean;
  /** Shown under every step (the lesson assistant). */
  help?: React.ReactNode;
}) {
  const solved = solvedStore.parse(useSyncExternalStore(solvedStore.subscribe, solvedStore.getSnapshot, solvedStore.getServerSnapshot));
  const saved = useSyncExternalStore(
    noop,
    () => readSaved(lessonId),
    () => 0,
  );
  const [picked, setPicked] = useState<number | null>(null);
  const [videoDone, setVideoDone] = useState(initialVideoDone);
  const [move, setMove] = useState<{ dir: 1 | -1; wave: boolean; n: number }>({ dir: 1, wave: false, n: 0 });

  useEffect(() => {
    const onVideo = () => setVideoDone(true);
    window.addEventListener(VIDEO_DONE, onVideo);
    return () => window.removeEventListener(VIDEO_DONE, onVideo);
  }, []);

  const doneStep = (s: LessonStep) => completed || ((!s.video || videoDone) && s.requires.every((id) => solved.has(id)));
  // The furthest step the student may open: every step before it is done.
  let reachable = 0;
  while (reachable < steps.length - 1 && doneStep(steps[reachable])) reachable++;
  const index = Math.min(picked ?? saved, reachable, steps.length - 1);
  const step = steps[index];
  const next = steps[index + 1];
  const canNext = Boolean(next) && doneStep(step);

  const go = (to: number) => {
    const fromVideo = Boolean(steps[index]?.video) && to > index;
    setMove((m) => ({ dir: to >= index ? 1 : -1, wave: fromVideo && !calmMotion(), n: m.n + 1 }));
    if (fromVideo) fx("pour");
    setPicked(to);
    try {
      localStorage.setItem(stepKey(lessonId), String(to));
    } catch {
      // storage unavailable: the lesson opens at the first step next time
    }
    if (!(Boolean(steps[index]?.video) && to > index)) fx("whoosh");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const waiting = step.video && !videoDone ? "شاهد 80% من الفيديو لتفتح الخطوة التالية" : step.requires.length ? "أكمل هذه الخطوة لتفتح التالية" : null;

  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="خطوات الدرس" className="sticky top-[60px] z-[5] -mx-4 bg-background/95 px-4 pt-1 pb-2 backdrop-blur">
        <ol className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
          {steps.map((s, i) => {
            const isDone = i < index || (i !== index && doneStep(s) && i <= reachable);
            const locked = i > reachable;
            return (
              <li key={s.key} className="flex-none">
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => go(i)}
                  aria-current={i === index ? "step" : undefined}
                  className={cn(
                    "flex min-h-11 items-center gap-1.5 rounded-full border-2 px-3 text-[13px] font-bold whitespace-nowrap transition-colors",
                    i === index
                      ? "border-primary bg-primary text-white"
                      : isDone
                        ? "border-success/40 bg-success-tint text-success"
                        : "border-border bg-card text-muted-foreground",
                    locked && "opacity-60",
                  )}
                >
                  <span aria-hidden="true">{locked ? <Lock className="size-3.5" /> : isDone && i !== index ? <Check className="size-3.5" /> : s.icon}</span>
                  {s.title}
                </button>
              </li>
            );
          })}
        </ol>
        <div className="mt-1">
          <WaterBar value={index + (doneStep(step) ? 1 : 0)} max={steps.length} label="تقدم الدرس" />
        </div>
      </nav>

      {move.wave && (
        <div
          key={`wave-${move.n}`}
          aria-hidden="true"
          className="pointer-events-none fixed inset-y-0 start-0 z-50 w-[150%] motion-safe:animate-[wave-wipe_.8s_cubic-bezier(.45,0,.2,1)_forwards]"
          style={{ transform: "translateX(105%)" }}
        >
          <svg viewBox="0 0 150 100" preserveAspectRatio="none" className="size-full">
            <defs>
              <linearGradient id="lessonWave" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#6CCBF2" />
                <stop offset="1" stopColor="#1C6FA3" />
              </linearGradient>
            </defs>
            <path
              d="M12 0 C4 12 20 24 10 36 C2 48 18 62 8 76 C2 86 14 94 10 100 L140 100 C146 90 132 80 140 66 C148 52 134 40 142 26 C148 14 136 6 140 0 Z"
              fill="url(#lessonWave)"
            />
          </svg>
        </div>
      )}
      <section
        key={step.key}
        aria-label={step.title}
        className={cn(
          "flex flex-col gap-4",
          move.dir > 0
            ? "motion-safe:animate-[slide-in-ltr_.38s_cubic-bezier(.2,.8,.2,1)]"
            : "motion-safe:animate-[slide-in-rtl_.38s_cubic-bezier(.2,.8,.2,1)]",
        )}
      >
        <p className="text-xs font-semibold text-muted-foreground">
          الخطوة {index + 1} من {steps.length}
        </p>
        {step.content}
      </section>

      {next && (
        <div className="flex flex-col gap-1.5">
          <div className="flex gap-2">
            {index > 0 && (
              <button
                type="button"
                onClick={() => go(index - 1)}
                className="flex min-h-13 items-center gap-1 rounded-xl border-2 border-border bg-card px-4 font-semibold shadow-[0_4px_0_var(--color-border)] active:translate-y-1 active:shadow-none"
              >
                <ArrowRight className="size-5" aria-hidden="true" />
                السابق
              </button>
            )}
            <button
              type="button"
              disabled={!canNext}
              onClick={() => go(index + 1)}
              className="flex min-h-13 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 font-bold text-white shadow-[0_5px_0_var(--color-primary-hover)] active:translate-y-[5px] active:shadow-none disabled:bg-border disabled:text-muted-foreground disabled:shadow-[0_5px_0_var(--color-input)]"
            >
              {!canNext && <Lock className="size-4" aria-hidden="true" />}
              التالي: {next.title}
              <ArrowLeft className="size-5" aria-hidden="true" />
            </button>
          </div>
          {!canNext && waiting && <p className="text-center text-xs text-muted-foreground">{waiting}</p>}
        </div>
      )}
      {!next && index > 0 && (
        <button
          type="button"
          onClick={() => go(index - 1)}
          className="flex min-h-11 items-center justify-center gap-1 text-sm font-semibold text-muted-foreground"
        >
          <ArrowRight className="size-4" aria-hidden="true" />
          رجوع إلى {steps[index - 1].title}
        </button>
      )}
      {help}
    </div>
  );
}
