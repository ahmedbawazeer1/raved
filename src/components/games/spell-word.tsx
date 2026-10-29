"use client";

import { useMemo, useState } from "react";
import { Delete } from "lucide-react";
import { Button } from "@/components/ui/button";
import { En } from "@/components/en";
import { scramble, seededRandom, shuffle, singleWords, type GameWord } from "@/lib/games/logic";
import { cn } from "@/lib/utils";

/** Guess the word: the Arabic meaning is the hint; tap the scrambled letters in order. 4 words. */
export function SpellWord({ words, seed, onDone }: { words: GameWord[]; seed: string; onDone: (score: number) => void }) {
  const list = useMemo(() => shuffle(singleWords(words), seededRandom(seed)).slice(0, 4), [words, seed]);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number[]>([]);
  const [wrong, setWrong] = useState(false);
  const [hints, setHints] = useState(0);
  const target = list[i];
  const letters = useMemo(() => (target ? scramble(target.word.toLowerCase(), seededRandom(`${seed}:${i}`)) : []), [target, seed, i]);

  if (list.length === 0) {
    return (
      <Button type="button" onClick={() => onDone(0)}>
        لا توجد كلمات مناسبة لهذه اللعبة · تابع
      </Button>
    );
  }
  if (!target) return null;

  const typed = picked.map((p) => letters[p]).join("");
  const tap = (index: number) => {
    if (picked.includes(index)) return;
    const next = [...picked, index];
    setPicked(next);
    const word = next.map((p) => letters[p]).join("");
    if (word.length === letters.length) {
      if (word === target.word.toLowerCase()) {
        setTimeout(() => {
          setPicked([]);
          if (i + 1 >= list.length) onDone(Math.max(10, list.length * 25 - hints * 5));
          else setI(i + 1);
        }, 600);
      } else {
        setWrong(true);
        setTimeout(() => {
          setWrong(false);
          setPicked([]);
        }, 700);
      }
    }
  };
  const hint = () => {
    // Put the next correct letter.
    const need = target.word.toLowerCase()[typed.length];
    const index = letters.findIndex((l, k) => l === need && !picked.includes(k));
    if (index >= 0) {
      setHints((h) => h + 1);
      tap(index);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-center">
        المعنى: <span className="text-xl font-bold">{target.meaning}</span>
      </p>
      <div dir="ltr" className={cn("flex min-h-12 justify-center gap-1 rounded-xl p-2", wrong ? "bg-destructive-tint" : "bg-muted")}>
        {letters.map((_, k) => (
          <span key={k} className="flex w-8 items-end justify-center border-b-2 border-foreground pb-0.5 font-en text-xl font-bold">
            {typed[k] ?? ""}
          </span>
        ))}
      </div>
      <div dir="ltr" className="flex flex-wrap justify-center gap-2">
        {letters.map((l, k) => (
          <button
            key={k}
            type="button"
            disabled={picked.includes(k)}
            onClick={() => tap(k)}
            className="size-12 rounded-xl border-2 border-primary bg-card font-en text-xl font-bold disabled:opacity-30"
          >
            {l}
          </button>
        ))}
      </div>
      <div className="flex justify-center gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={() => setPicked(picked.slice(0, -1))} disabled={!picked.length}>
          <Delete className="size-4" aria-hidden="true" />
          امسح
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={hint}>
          تلميح
        </Button>
      </div>
      <p className="text-center text-xs text-muted-foreground">
        الكلمة {i + 1} من {list.length} · <En>{target.word.length}</En> حروف
      </p>
    </div>
  );
}
