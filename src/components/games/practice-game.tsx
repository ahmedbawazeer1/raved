"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { recordGame } from "@/app/(student)/student/practice/games/actions";
import type { GameKind, GameWord } from "@/lib/games/logic";
import { GameView } from "./game-view";

/** A game in the games hub: finishing it earns the day's points for this game. */
export function PracticeGame({ kind, words }: { kind: GameKind; words: GameWord[] }) {
  const [, startTransition] = useTransition();
  const [earned, setEarned] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <GameView
        kind={kind}
        words={words}
        onDone={() =>
          startTransition(async () => {
            const played = await recordGame(kind);
            if (played !== null) setEarned(true);
          })
        }
      />
      {earned && (
        <p role="status" className="flex items-center justify-center gap-1.5 rounded-xl bg-warning-tint p-3 font-semibold text-warning">
          <Star className="size-5 fill-current" aria-hidden="true" />
          نقاط اللعبة محسوبة لك اليوم
        </p>
      )}
    </div>
  );
}
