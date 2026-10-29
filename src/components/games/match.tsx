"use client";

import { useMemo, useState } from "react";
import { En } from "@/components/en";
import { seededRandom, shuffle, type GameWord } from "@/lib/games/logic";
import { cn } from "@/lib/utils";

/** Match pairs: pick a word, then its meaning. Up to 6 pairs per round. */
export function MatchPairs({ words, seed, onDone }: { words: GameWord[]; seed: string; onDone: (score: number) => void }) {
  const set = useMemo(() => shuffle(words, seededRandom(seed)).slice(0, 6), [words, seed]);
  const meanings = useMemo(() => shuffle(set, seededRandom(`${seed}:m`)), [set, seed]);
  const [picked, setPicked] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrong, setWrong] = useState<string | null>(null);
  const [mistakes, setMistakes] = useState(0);

  const chooseMeaning = (id: string) => {
    if (!picked || matched.has(id)) return;
    if (id === picked) {
      const next = new Set(matched).add(id);
      setMatched(next);
      setPicked(null);
      if (next.size === set.length) setTimeout(() => onDone(Math.max(0, set.length * 10 - mistakes * 3)), 500);
    } else {
      setWrong(id);
      setMistakes((m) => m + 1);
      setTimeout(() => setWrong(null), 600);
    }
  };

  const cell = "min-h-12 rounded-xl border-2 px-2 py-2 text-[15px] font-semibold transition-colors";
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="flex flex-col gap-2">
        {set.map((w) => (
          <button
            key={w.id}
            type="button"
            disabled={matched.has(w.id)}
            onClick={() => setPicked(w.id)}
            className={cn(
              cell,
              matched.has(w.id) ? "border-success bg-success-tint text-success" : picked === w.id ? "border-primary bg-primary-tint" : "border-border bg-card",
            )}
          >
            <En>{w.word}</En>
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {meanings.map((w) => (
          <button
            key={w.id}
            type="button"
            disabled={matched.has(w.id)}
            onClick={() => chooseMeaning(w.id)}
            className={cn(
              cell,
              matched.has(w.id)
                ? "border-success bg-success-tint text-success"
                : wrong === w.id
                  ? "border-destructive bg-destructive-tint"
                  : "border-border bg-card",
            )}
          >
            {w.meaning}
          </button>
        ))}
      </div>
      <p className="col-span-2 text-center text-xs text-muted-foreground">
        {picked ? "الآن اختر المعنى من العمود الأيسر" : "اختر كلمة من العمود الأيمن"} · {matched.size} من {set.length}
      </p>
    </div>
  );
}
