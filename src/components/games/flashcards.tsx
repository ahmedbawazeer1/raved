"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { En } from "@/components/en";
import type { GameWord } from "@/lib/games/logic";
import { speak } from "@/lib/tts";
import { cn } from "@/lib/utils";

/** Flip cards: done when every card was turned at least once. */
export function Flashcards({ words, onDone }: { words: GameWord[]; onDone: () => void }) {
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const w = words[i];
  if (!w) return null;

  const flip = () => {
    setFlipped((f) => !f);
    if (!flipped) {
      const next = new Set(seen).add(w.id);
      setSeen(next);
      if (next.size === words.length) setTimeout(onDone, 900);
    }
  };
  const go = (d: number) => {
    setFlipped(false);
    setI((i + d + words.length) % words.length);
  };

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={flip}
        aria-label={flipped ? `${w.meaning}. اضغط لترى الكلمة` : `${w.word}. اضغط لترى المعنى`}
        className="perspective-[800px] h-44 w-full"
      >
        <span className={cn("relative block size-full transition-transform duration-500 transform-3d", flipped && "rotate-y-180")}>
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-2xl bg-primary p-4 text-white backface-hidden">
            <En className="text-3xl font-bold">{w.word}</En>
            <span className="text-xs text-primary-tint">اضغط لتقلب البطاقة</span>
          </span>
          <span className="absolute inset-0 flex rotate-y-180 flex-col items-center justify-center gap-2 rounded-2xl bg-warning-tint p-4 backface-hidden">
            <span className="text-2xl font-bold">{w.meaning}</span>
            <En className="text-sm text-muted-foreground">{w.example}</En>
          </span>
        </span>
      </button>
      <div className="flex items-center justify-between gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={() => go(-1)} aria-label="السابقة">
          <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={() => speak(`${w.word}. ${w.example}`, { rate: 0.85 })}>
          <Volume2 className="size-4" aria-hidden="true" />
          استمع
        </Button>
        <span className="text-sm text-muted-foreground">
          {seen.size} من {words.length}
        </span>
        <Button type="button" variant="secondary" size="sm" onClick={() => go(1)} aria-label="التالية">
          <ChevronLeft className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
