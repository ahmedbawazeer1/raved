"use client";

import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Mic, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { En } from "@/components/en";
import { heardWord, seededRandom, shuffle, singleWords, type GameWord } from "@/lib/games/logic";
import { speak } from "@/lib/tts";

interface Recognition {
  lang: string;
  maxAlternatives: number;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | null {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}
const noop = () => () => {};

/**
 * Pronunciation challenge: say the word; the browser's speech recognition listens (nothing is recorded
 * or sent by us). 3 words. Without speech recognition on the phone, the game is skipped.
 */
export function Pronounce({ words, seed, onDone }: { words: GameWord[]; seed: string; onDone: (score: number) => void }) {
  const supported = useSyncExternalStore(noop, () => recognitionCtor() !== null, () => null);
  const list = useMemo(() => shuffle(singleWords(words), seededRandom(seed)).slice(0, 3), [words, seed]);
  const [i, setI] = useState(0);
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState<string | null>(null);
  const [ok, setOk] = useState<boolean | null>(null);
  const [fails, setFails] = useState(0);
  const rec = useRef<Recognition | null>(null);
  const target = list[i];

  if (supported === false || list.length === 0) {
    return (
      <div className="flex flex-col gap-2 text-sm">
        <p className="text-muted-foreground">هاتفك لا يدعم تمييز الكلام في المتصفح. انطق الكلمات بصوت مرتفع وتابع.</p>
        <Button type="button" variant="secondary" onClick={() => onDone(0)}>
          تابع
        </Button>
      </div>
    );
  }
  if (!target) return null;

  const listen = () => {
    const Ctor = recognitionCtor();
    if (!Ctor) return;
    const r = new Ctor();
    r.lang = "en-US";
    r.maxAlternatives = 5;
    r.interimResults = false;
    r.onresult = (e) => {
      const alts = Array.from(e.results[0] ?? []).map((a) => a.transcript);
      setHeard(alts[0] ?? "");
      const right = heardWord(alts, target.word);
      setOk(right);
      if (right) {
        setTimeout(() => {
          setOk(null);
          setHeard(null);
          setFails(0);
          if (i + 1 >= list.length) onDone(list.length * 20);
          else setI(i + 1);
        }, 900);
      } else setFails((f) => f + 1);
    };
    r.onerror = () => setListening(false);
    r.onend = () => setListening(false);
    rec.current = r;
    setHeard(null);
    setOk(null);
    setListening(true);
    r.start();
  };

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <En className="text-4xl font-bold">{target.word}</En>
      <span className="text-muted-foreground">{target.meaning}</span>
      <div className="flex gap-2">
        <Button type="button" variant="secondary" onClick={() => speak(target.word, { rate: 0.8 })}>
          <Volume2 className="size-4" aria-hidden="true" />
          اسمع أولاً
        </Button>
        <Button type="button" onClick={listening ? () => rec.current?.stop() : listen}>
          <Mic className="size-4" aria-hidden="true" />
          {listening ? "أستمع…" : "انطق الآن"}
        </Button>
      </div>
      {heard !== null && (
        <p role="status" className={ok ? "font-semibold text-success" : "text-destructive"}>
          سمعت: <En>«{heard || "…"}»</En> {ok ? "✓ ممتاز" : "— حاول مرة أخرى"}
        </p>
      )}
      {fails >= 3 && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => {
            setFails(0);
            setHeard(null);
            if (i + 1 >= list.length) onDone(0);
            else setI(i + 1);
          }}
        >
          تخطَّ هذه الكلمة
        </Button>
      )}
      <p className="text-xs text-muted-foreground">
        الكلمة {i + 1} من {list.length} · لا يُسجَّل صوتك ولا يُحفظ
      </p>
    </div>
  );
}
