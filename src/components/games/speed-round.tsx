"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { En } from "@/components/en";
import { choiceRound, seededRandom, shuffle, type GameWord } from "@/lib/games/logic";
import { cn } from "@/lib/utils";

const SECONDS = 60;
/** Correct answers needed to finish the challenge. */
export const SPEED_GOAL = 8;

/** One-minute race: as many right meanings as possible. Reaching the goal finishes it; otherwise try again. */
export function SpeedRound({ words, seed, onDone }: { words: GameWord[]; seed: string; onDone: (score: number) => void }) {
  const order = useMemo(() => shuffle([...words, ...words, ...words], seededRandom(seed)), [words, seed]);
  const [started, setStarted] = useState(false);
  const [left, setLeft] = useState(SECONDS);
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [flash, setFlash] = useState<"right" | "wrong" | null>(null);
  const finished = useRef(false);
  const target = order[i % order.length];
  const options = useMemo(() => (target ? choiceRound(target, words, 3, seededRandom(`${seed}:${i}`)) : []), [target, words, seed, i]);

  useEffect(() => {
    if (!started || left <= 0) return;
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
  }, [started, left]);

  const over = started && left <= 0;
  if (!target) return null;

  if (!started || over) {
    return (
      <div className="flex flex-col items-center gap-2 text-center">
        {over && (
          <p className="font-semibold">
            انتهى الوقت! أجبت {score} إجابة صحيحة. {score >= SPEED_GOAL ? "" : `تحتاج ${SPEED_GOAL} لتنجح.`}
          </p>
        )}
        {!over && <p className="text-sm text-muted-foreground">الهدف: {SPEED_GOAL} إجابات صحيحة في دقيقة.</p>}
        <Button
          type="button"
          onClick={() => {
            if (over && score >= SPEED_GOAL && !finished.current) {
              finished.current = true;
              onDone(score * 10);
              return;
            }
            setScore(0);
            setI(0);
            setLeft(SECONDS);
            setStarted(true);
          }}
        >
          {over ? (score >= SPEED_GOAL ? "تم ✓" : "حاول مرة أخرى") : "ابدأ السباق"}
        </Button>
      </div>
    );
  }

  const choose = (id: string) => {
    const right = id === target.id;
    setFlash(right ? "right" : "wrong");
    if (right) setScore((s) => s + 1);
    setTimeout(() => setFlash(null), 250);
    setI((x) => x + 1);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-sm">
        <span className={cn("flex items-center gap-1 font-en font-bold", left <= 10 && "text-destructive")}>
          <Timer className="size-4" aria-hidden="true" />
          {left}
        </span>
        <span className="font-semibold">✓ {score}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary transition-all" style={{ width: `${(left / SECONDS) * 100}%` }} />
      </div>
      <p className={cn("rounded-xl py-4 text-center text-2xl font-bold", flash === "right" ? "bg-success-tint" : flash === "wrong" ? "bg-destructive-tint" : "bg-muted")}>
        <En>{target.word}</En>
      </p>
      <div className="grid grid-cols-1 gap-2">
        {options.map((o) => (
          <button key={o.id} type="button" onClick={() => choose(o.id)} className="min-h-12 rounded-xl border-2 border-border bg-card font-semibold">
            {o.meaning}
          </button>
        ))}
      </div>
    </div>
  );
}
