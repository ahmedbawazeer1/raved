"use client";

import { useMemo, useState } from "react";
import { Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { choiceRound, seededRandom, shuffle, type GameWord } from "@/lib/games/logic";
import { speak } from "@/lib/tts";
import { cn } from "@/lib/utils";

/** Listen and choose: the phone says a word, the student picks its meaning. 6 rounds. */
export function ListenChoose({ words, seed, onDone }: { words: GameWord[]; seed: string; onDone: (score: number) => void }) {
  const rounds = useMemo(() => shuffle(words, seededRandom(seed)).slice(0, Math.min(6, words.length)), [words, seed]);
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [answer, setAnswer] = useState<string | null>(null);
  const target = rounds[i];
  const options = useMemo(() => (target ? choiceRound(target, words, 4, seededRandom(`${seed}:${i}`)) : []), [target, words, seed, i]);
  if (!target) return null;

  const choose = (id: string) => {
    if (answer) return;
    setAnswer(id);
    const right = id === target.id;
    const nextScore = score + (right ? 1 : 0);
    if (right) setScore(nextScore);
    setTimeout(() => {
      setAnswer(null);
      if (!right) return; // try again until right
      if (i + 1 >= rounds.length) onDone(nextScore * 10);
      else setI(i + 1);
    }, 700);
  };

  return (
    <div className="flex flex-col gap-3">
      <Button type="button" className="min-h-14 self-center" onClick={() => speak(target.word, { rate: 0.8 })}>
        <Volume2 className="size-5" aria-hidden="true" />
        اسمع الكلمة
      </Button>
      <div className="grid grid-cols-2 gap-2">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => choose(o.id)}
            className={cn(
              "min-h-12 rounded-xl border-2 px-2 font-semibold",
              answer === o.id ? (o.id === target.id ? "border-success bg-success-tint" : "border-destructive bg-destructive-tint") : "border-border bg-card",
            )}
          >
            {o.meaning}
          </button>
        ))}
      </div>
      <p className="text-center text-xs text-muted-foreground">
        الجولة {i + 1} من {rounds.length}
      </p>
    </div>
  );
}
