"use client";

import { useMemo, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { En } from "@/components/en";
import { seededRandom, swipeCards, type GameWord } from "@/lib/games/logic";
import { cn } from "@/lib/utils";

const CARDS = 8;
const PASS = 6;

/** True or false: swipe right (صح) or left (خطأ), or tap the buttons. Pass with 6 of 8. */
export function SwipeCards({ words, seed, onDone }: { words: GameWord[]; seed: string; onDone: (score: number) => void }) {
  const cards = useMemo(() => swipeCards(words, CARDS, seededRandom(seed)), [words, seed]);
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [dx, setDx] = useState(0);
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const start = useRef<number | null>(null);
  const card = cards[i];

  const judge = (saysTrue: boolean) => {
    if (!card || feedback !== null) return;
    const right = saysTrue === card.correct;
    const nextScore = score + (right ? 1 : 0);
    setScore(nextScore);
    setFeedback(right);
    setTimeout(() => {
      setFeedback(null);
      setDx(0);
      if (i + 1 < cards.length) setI(i + 1);
      else if (nextScore >= PASS) onDone(nextScore * 10);
      else {
        setI(0);
        setScore(0);
      }
    }, 650);
  };

  if (!card) return null;
  return (
    <div className="flex flex-col gap-3">
      <div
        role="group"
        aria-label="بطاقة: هل المعنى صحيح؟"
        onPointerDown={(e) => (start.current = e.clientX)}
        onPointerMove={(e) => start.current !== null && setDx(e.clientX - start.current)}
        onPointerUp={() => {
          // Right = true (صح), left = false (خطأ), like the buttons below.
          if (dx > 70) judge(true);
          else if (dx < -70) judge(false);
          else setDx(0);
          start.current = null;
        }}
        style={{ transform: `translateX(${dx}px) rotate(${dx / 20}deg)` }}
        className={cn(
          "flex touch-pan-y flex-col items-center gap-2 rounded-2xl border-2 p-6 text-center transition-colors select-none",
          feedback === true ? "border-success bg-success-tint" : feedback === false ? "border-destructive bg-destructive-tint" : "border-border bg-card",
        )}
      >
        <En className="text-3xl font-bold">{card.word.word}</En>
        <span className="text-xl">= {card.meaning}</span>
        {feedback !== null && <span className="font-semibold">{feedback ? "أحسنت" : card.correct ? "كان صحيحاً" : `المعنى: ${card.word.meaning}`}</span>}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="secondary" className="min-h-12" onClick={() => judge(false)}>
          <X className="size-5 text-destructive" aria-hidden="true" />
          خطأ
        </Button>
        <Button type="button" className="min-h-12" onClick={() => judge(true)}>
          <Check className="size-5" aria-hidden="true" />
          صح
        </Button>
      </div>
      <p className="text-center text-xs text-muted-foreground">
        البطاقة {i + 1} من {cards.length} · صحيح: {score} · المطلوب {PASS}
      </p>
    </div>
  );
}
