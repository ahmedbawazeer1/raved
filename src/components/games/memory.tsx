"use client";

import { useMemo, useState } from "react";
import { En } from "@/components/en";
import { seededRandom, shuffle, type GameWord } from "@/lib/games/logic";
import { cn } from "@/lib/utils";

interface Tile {
  key: string;
  pair: string;
  text: string;
  english: boolean;
}

/** Memory: 6 pairs face down (word + meaning). Turn two; a matching pair stays open. */
export function MemoryGame({ words, seed, onDone }: { words: GameWord[]; seed: string; onDone: (score: number) => void }) {
  const tiles = useMemo<Tile[]>(() => {
    const set = shuffle(words, seededRandom(seed)).slice(0, 6);
    return shuffle(
      set.flatMap((w) => [
        { key: `${w.id}:w`, pair: w.id, text: w.word, english: true },
        { key: `${w.id}:m`, pair: w.id, text: w.meaning, english: false },
      ]),
      seededRandom(`${seed}:t`),
    );
  }, [words, seed]);
  const [open, setOpen] = useState<string[]>([]);
  const [found, setFound] = useState<Set<string>>(new Set());
  const [moves, setMoves] = useState(0);

  const turn = (t: Tile) => {
    if (open.length === 2 || open.includes(t.key) || found.has(t.pair)) return;
    const next = [...open, t.key];
    setOpen(next);
    if (next.length < 2) return;
    const nextMoves = moves + 1;
    setMoves(nextMoves);
    const [a, b] = next.map((k) => tiles.find((x) => x.key === k)!);
    setTimeout(() => {
      if (a.pair === b.pair) {
        const f = new Set(found).add(a.pair);
        setFound(f);
        if (f.size * 2 === tiles.length) onDone(Math.max(10, 100 - (nextMoves - f.size) * 5));
      }
      setOpen([]);
    }, a.pair === b.pair ? 300 : 900);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-3 gap-2">
        {tiles.map((t) => {
          const shown = open.includes(t.key) || found.has(t.pair);
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => turn(t)}
              aria-label={shown ? t.text : "بطاقة مقلوبة"}
              className={cn(
                "flex min-h-16 items-center justify-center rounded-xl border-2 p-1.5 text-center text-sm font-semibold",
                found.has(t.pair) ? "border-success bg-success-tint" : shown ? "border-primary bg-primary-tint" : "border-primary bg-primary text-white",
              )}
            >
              {shown ? t.english ? <En>{t.text}</En> : t.text : "؟"}
            </button>
          );
        })}
      </div>
      <p className="text-center text-xs text-muted-foreground">
        المحاولات: {moves} · الأزواج: {found.size} من {tiles.length / 2}
      </p>
    </div>
  );
}
