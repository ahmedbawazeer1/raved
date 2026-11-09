"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2 } from "lucide-react";
import type { ArenaGame, ArenaQuestion } from "@shared/arena/games";
import { WordBank } from "@/components/lesson/question-input";
import { Button } from "@/components/ui/button";
import { fx } from "@/lib/fx";
import { speak } from "@/lib/tts";
import { cn } from "@/lib/utils";

export interface Feedback {
  ok: boolean;
  answer: string | null;
  given: string;
}

interface GameProps {
  q: ArenaQuestion;
  onAnswer: (answer: string) => void;
  feedback: Feedback | null;
  /** Correct answers so far (bridge planks). */
  right: number;
  total: number;
}

const choice = (state: "idle" | "right" | "wrong" | "dim") =>
  cn(
    "min-h-14 rounded-2xl rounded-es-md border-2 px-3 py-2 font-bold transition-all active:translate-y-0.5",
    state === "idle" && "border-border bg-card shadow-[0_4px_0_var(--color-border)] hover:border-primary",
    state === "right" && "border-success bg-[#E3F7EC] text-success shadow-[0_4px_0_#9BD9B5]",
    state === "wrong" && "animate-[shake_.35s] border-error bg-[#FDECEA] text-error",
    state === "dim" && "border-border bg-card opacity-50",
  );

function stateOf(i: number, fb: Feedback | null): "idle" | "right" | "wrong" | "dim" {
  if (!fb) return "idle";
  if (String(i) === fb.answer) return "right";
  if (String(i) === fb.given) return "wrong";
  return "dim";
}

/** سباق القطرات: an English word, four Arabic meanings. */
function Drops({ q, onAnswer, feedback }: GameProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="mx-auto flex min-h-28 min-w-48 items-center justify-center rounded-[48%_52%_50%_50%/60%_60%_40%_40%] bg-[radial-gradient(circle_at_30%_25%,#C9F1FF,#2E9BD6_70%,#1C6FA3)] px-8 py-6 text-white shadow-[inset_-6px_-8px_0_rgba(0,0,0,.12)]">
        <b className="font-en text-3xl" dir="ltr">
          {q.prompt}
        </b>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {(q.options ?? []).map((o, i) => (
          <button key={i} type="button" disabled={Boolean(feedback)} onClick={() => onAnswer(String(i))} className={choice(stateOf(i, feedback))}>
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

/** شبكة الصيّاد: leaves float down the river; tap the word that matches the meaning. */
function Net({ q, onAnswer, feedback }: GameProps) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-center text-lg">
        <b>اصطد:</b> {q.prompt}
      </p>
      <div className="relative grid grid-cols-2 gap-x-6 gap-y-4 overflow-hidden rounded-3xl bg-[linear-gradient(180deg,#8FD3F7,#2E9BD6)] p-5">
        <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(170deg,transparent_0_22px,rgba(255,255,255,.18)_22px_25px)] motion-safe:animate-[river-flow_3s_linear_infinite]" />
        {(q.options ?? []).map((o, i) => {
          const s = stateOf(i, feedback);
          return (
            <button
              key={i}
              type="button"
              disabled={Boolean(feedback)}
              onClick={() => onAnswer(String(i))}
              style={{ animationDelay: `${-i * 0.7}s` }}
              className={cn(
                "relative flex min-h-14 items-center justify-center rounded-[60%_40%_60%_40%] px-3 font-en font-bold shadow-[inset_-4px_-5px_0_rgba(0,0,0,.15)] motion-safe:animate-[leaf-bob_2.6s_ease-in-out_infinite]",
                s === "right" ? "bg-[#FFD27A] text-[#5A3A00]" : s === "wrong" ? "bg-[#F4A9A0] text-error" : "bg-[#3CC48F] text-white",
                s === "dim" && "opacity-50",
              )}
              dir="ltr"
            >
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** صيّاد الأخطاء: a sentence floats toward the dam; tap its wrong word before it arrives (8 s). */
function Errors({ q, onAnswer, feedback }: GameProps) {
  const [left, setLeft] = useState(100);
  const done = useRef(false);
  useEffect(() => {
    done.current = false;
    const start = performance.now();
    const t = setInterval(() => {
      const p = Math.max(0, 100 - ((performance.now() - start) / 8000) * 100);
      setLeft(p);
      if (p === 0 && !done.current) {
        done.current = true;
        onAnswer("-1");
      }
    }, 100);
    return () => clearInterval(t);
  }, [q, onAnswer]);
  const tap = (i: number) => {
    if (done.current) return;
    done.current = true;
    onAnswer(String(i));
  };
  return (
    <div className="flex flex-col gap-4">
      <p className="text-center text-sm text-muted-foreground">في الجملة كلمة واحدة خطأ. اضغطها!</p>
      <div className="relative h-3 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <div className="absolute inset-y-0 start-0 rounded-full bg-[#2E9BD6] transition-[width] duration-100" style={{ width: `${feedback ? 0 : left}%` }} />
      </div>
      <div className="flex flex-wrap justify-center gap-2 rounded-3xl bg-[#E3F2EE] p-4" dir="ltr">
        {(q.words ?? []).map((w, i) => (
          <button
            key={i}
            type="button"
            disabled={Boolean(feedback)}
            onClick={() => tap(i)}
            className={cn(choice(stateOf(i, feedback) === "dim" ? "idle" : stateOf(i, feedback)), "min-h-12 font-en")}
          >
            {w}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground" aria-hidden="true">
        <span className="h-2 w-16 rounded bg-[#9AA6B8]" /> السدّ
      </div>
    </div>
  );
}

/** جسر الكلمات: order the words; every right sentence lays a plank. */
function Bridge({ q, onAnswer, feedback, right, total }: GameProps) {
  const [chosen, setChosen] = useState<string[]>([]);
  const tiles = q.tiles ?? [];
  return (
    <div className="flex flex-col gap-4">
      <svg viewBox="0 0 300 70" className="w-full" aria-hidden="true">
        <rect width="300" height="70" rx="16" fill="#8FD3F7" />
        <path d="M0 58 Q150 48 300 58 V70 H0Z" fill="#2E9BD6" />
        <rect x="0" y="22" width="34" height="48" fill="#A9E6C9" />
        <rect x="266" y="22" width="34" height="48" fill="#A9E6C9" />
        {Array.from({ length: total }, (_, i) => {
          const x = 34 + (i * 232) / total;
          return (
            <rect
              key={i}
              x={x + 1}
              y="24"
              width={232 / total - 2}
              height="9"
              rx="2"
              fill={i < right ? "#C77F06" : "#fff"}
              opacity={i < right ? 1 : 0.35}
              style={{ transition: "fill .3s" }}
            />
          );
        })}
      </svg>
      <WordBank words={tiles} value={chosen} onChange={(v) => setChosen(Array.isArray(v) ? v : [])} disabled={Boolean(feedback)} />
      {feedback && !feedback.ok && feedback.answer && (
        <p className="rounded-2xl bg-[#E3F7EC] p-3 text-center font-en text-success" dir="ltr">
          {feedback.answer}
        </p>
      )}
      <Button size="lg" disabled={Boolean(feedback) || chosen.length < tiles.length} onClick={() => onAnswer(chosen.join(" "))}>
        تحقّق
      </Button>
    </div>
  );
}

/** صدى الوادي: hear the sentence (the phone's voice), type it. */
function Echo({ q, onAnswer, feedback }: GameProps) {
  const [text, setText] = useState("");
  const say = () => {
    if (q.say && typeof window !== "undefined" && "speechSynthesis" in window) speak(q.say, { rate: 0.85 });
    fx("ripple");
  };
  useEffect(() => {
    const t = setTimeout(say, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per sentence
  }, [q]);
  return (
    <div className="flex flex-col gap-4">
      <div className="relative flex h-32 items-end justify-center overflow-hidden rounded-3xl bg-[linear-gradient(180deg,#EDE7FB,#F4EBFF)]">
        <svg viewBox="0 0 300 120" className="absolute inset-0 size-full" aria-hidden="true" preserveAspectRatio="none">
          <path d="M0 120 L60 40 L120 120Z" fill="#B9A5EE" />
          <path d="M180 120 L240 30 L300 120Z" fill="#9C84E3" />
        </svg>
        <button
          type="button"
          onClick={say}
          aria-label="استمع"
          className="relative mb-4 flex size-16 items-center justify-center rounded-full bg-[#6941C6] text-white shadow-[0_5px_0_#4B2D96] active:translate-y-1 active:shadow-none"
        >
          <Volume2 className="size-7" aria-hidden="true" />
        </button>
      </div>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={Boolean(feedback)}
        dir="ltr"
        lang="en"
        autoCapitalize="none"
        autoComplete="off"
        spellCheck={false}
        aria-label="اكتب ما سمعت"
        placeholder="Type what you hear…"
        className="min-h-12 rounded-2xl border-2 border-border bg-card px-4 font-en text-lg focus:border-primary focus:outline-none"
        onKeyDown={(e) => {
          if (e.key === "Enter" && text.trim() && !feedback) onAnswer(text);
        }}
      />
      {feedback && !feedback.ok && feedback.answer && (
        <p className="rounded-2xl bg-[#E3F7EC] p-3 text-center font-en text-success" dir="ltr">
          {feedback.answer}
        </p>
      )}
      <Button size="lg" disabled={Boolean(feedback) || !text.trim()} onClick={() => onAnswer(text)}>
        تحقّق
      </Button>
    </div>
  );
}

export const GAMES: Record<ArenaGame, (p: GameProps) => React.ReactNode> = { drops: Drops, net: Net, errors: Errors, bridge: Bridge, echo: Echo };
