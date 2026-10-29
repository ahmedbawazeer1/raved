"use client";

import type { GameKind, GameWord } from "@/lib/games/logic";
import { Dictation } from "./dictation";
import { Flashcards } from "./flashcards";
import { GameShell } from "./game-shell";
import { ListenChoose } from "./listen-choose";
import { MatchPairs } from "./match";
import { MemoryGame } from "./memory";
import { Pronounce } from "./pronounce";
import { SpeedRound } from "./speed-round";
import { SpellWord } from "./spell-word";
import { SwipeCards } from "./swipe-cards";

/** Any vocabulary game inside its frame. */
export function GameView({
  kind,
  words,
  title,
  solved,
  onDone,
}: {
  kind: GameKind;
  words: GameWord[];
  title?: string;
  solved?: boolean;
  onDone?: (score?: number) => void;
}) {
  if (words.length < 2) return null;
  return (
    <GameShell kind={kind} title={title} solved={solved} onDone={onDone}>
      {(done, seed) => {
        const props = { words, seed, onDone: done };
        switch (kind) {
          case "flashcards":
            return <Flashcards words={words} onDone={() => done()} />;
          case "match":
            return <MatchPairs {...props} />;
          case "listen":
            return <ListenChoose {...props} />;
          case "memory":
            return <MemoryGame {...props} />;
          case "speed":
            return <SpeedRound {...props} />;
          case "spell":
            return <SpellWord {...props} />;
          case "swipe":
            return <SwipeCards {...props} />;
          case "dictation":
            return <Dictation {...props} />;
          case "pronounce":
            return <Pronounce {...props} />;
        }
      }}
    </GameShell>
  );
}
