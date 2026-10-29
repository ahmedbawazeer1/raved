"use client";

import { useSyncExternalStore } from "react";
import { GameView } from "@/components/games/game-view";
import { markSolved, solvedStore } from "@/lib/gamification/events";
import type { GameKind, GameWord } from "@/lib/games/logic";

/** A game inside a lesson: finishing it counts as a solved activity of the lesson. */
export function GameBlock({ id, kind, title, words }: { id: string; kind: GameKind; title?: string; words: GameWord[] }) {
  const solved = solvedStore.parse(useSyncExternalStore(solvedStore.subscribe, solvedStore.getSnapshot, solvedStore.getServerSnapshot)).has(id);
  return <GameView kind={kind} words={words} title={title} solved={solved} onDone={() => markSolved(id)} />;
}
