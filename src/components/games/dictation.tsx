"use client";

import { useMemo, useState } from "react";
import { Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { En } from "@/components/en";
import { sameText, seededRandom, shuffle, type GameWord } from "@/lib/games/logic";
import { speak } from "@/lib/tts";

/** Dictation: hear an example sentence and type it (case and punctuation do not matter). 3 sentences. */
export function Dictation({ words, seed, onDone }: { words: GameWord[]; seed: string; onDone: (score: number) => void }) {
  const list = useMemo(() => shuffle(words.filter((w) => w.example), seededRandom(seed)).slice(0, 3), [words, seed]);
  const [i, setI] = useState(0);
  const [text, setText] = useState("");
  const [tries, setTries] = useState(0);
  const [result, setResult] = useState<"right" | "wrong" | null>(null);
  const target = list[i];
  if (!target) return null;

  const check = () => {
    if (sameText(text, target.example)) {
      setResult("right");
      setTimeout(() => {
        setResult(null);
        setText("");
        setTries(0);
        if (i + 1 >= list.length) onDone(list.length * 20);
        else setI(i + 1);
      }, 900);
    } else {
      setResult("wrong");
      setTries((t) => t + 1);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <Button type="button" className="min-h-12 self-center" onClick={() => speak(target.example, { rate: 0.75 })}>
        <Volume2 className="size-5" aria-hidden="true" />
        اسمع الجملة
      </Button>
      <Input
        dir="ltr"
        lang="en"
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        aria-label="اكتب ما سمعته بالإنجليزية"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setResult(null);
        }}
        className="font-en text-lg"
      />
      {result === "wrong" && (
        <p role="status" className="rounded-xl bg-destructive-tint p-2.5 text-sm">
          ليست مطابقة. اسمع مرة أخرى وجرّب.
          {tries >= 2 && (
            <>
              {" "}الجملة: <En className="font-semibold">{target.example}</En>
            </>
          )}
        </p>
      )}
      {result === "right" && (
        <p role="status" className="rounded-xl bg-success-tint p-2.5 text-sm font-semibold text-success">
          صحيح!
        </p>
      )}
      <Button type="button" variant="secondary" disabled={!text.trim()} onClick={check}>
        تحقق
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        الجملة {i + 1} من {list.length}
      </p>
    </div>
  );
}
