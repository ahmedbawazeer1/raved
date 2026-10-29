"use client";

import { useState, type ReactNode } from "react";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GAME_TITLES, type GameKind } from "@/lib/games/logic";

/**
 * Frame of every game: title, hint, the game itself, and a «done» banner with replay.
 * `children(onDone, seed)` renders the game; replay remounts it with a new seed (orders stay the same on server and client).
 */
export function GameShell({
  kind,
  title,
  solved,
  onDone,
  children,
}: {
  kind: GameKind;
  title?: string;
  /** Already finished before (this lesson's requirement is met). */
  solved?: boolean;
  onDone?: (score?: number) => void;
  children: (done: (score?: number) => void, seed: string) => ReactNode;
}) {
  const meta = GAME_TITLES[kind];
  const [round, setRound] = useState(0);
  const [finished, setFinished] = useState<{ score?: number } | null>(null);
  const done = (score?: number) => {
    setFinished({ score });
    onDone?.(score);
  };

  return (
    <Card className="flex flex-col gap-3 overflow-hidden p-4">
      <div className="flex items-start gap-2.5">
        <span className="text-2xl" aria-hidden="true">
          {meta.icon}
        </span>
        <div className="flex-1">
          <p className="text-xs font-semibold text-primary">لعبة</p>
          <h3 className="font-bold">{title ?? meta.title}</h3>
          <p className="text-sm text-muted-foreground">{meta.hint}</p>
        </div>
        {(solved || finished) && <CheckCircle2 className="size-6 text-success" aria-label="أنهيتها" />}
      </div>
      {finished ? (
        <div role="status" className="flex flex-col items-center gap-2 rounded-xl bg-success-tint p-4 text-center">
          <p className="text-lg font-bold text-success">أحسنت! 🎉</p>
          {finished.score !== undefined && <p className="font-semibold">النتيجة: {finished.score}</p>}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              setFinished(null);
              setRound((r) => r + 1);
            }}
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            العب مرة أخرى
          </Button>
        </div>
      ) : (
        <div key={round}>{children(done, `${kind}:${round}`)}</div>
      )}
    </Card>
  );
}
