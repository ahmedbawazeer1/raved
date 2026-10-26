"use client";

import { useState } from "react";
import { ChevronLeft, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { En } from "@/components/en";
import { speak, useEnglishVoice, useSpeechSupported } from "@/lib/tts";

/** Hear a sentence in the phone's voice and repeat it aloud. No recording, no data: works offline. */
export function ListenRepeat({ sentences }: { sentences: { en: string; ar: string | null }[] }) {
  const [index, setIndex] = useState(0);
  const [showText, setShowText] = useState(false);
  const [slow, setSlow] = useState(false);
  const supported = useSpeechSupported();
  const hasVoice = useEnglishVoice();
  const s = sentences[index % sentences.length];
  const canSpeak = supported !== false && hasVoice;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] text-muted-foreground">
        {(index % sentences.length) + 1} من {sentences.length} · اسمع ثم كرّر بصوت عالٍ
      </p>
      <Card className="flex min-h-56 flex-col items-center justify-center gap-4 p-5 text-center">
        {canSpeak ? (
          <Button className="size-16 rounded-full p-0" aria-label="استمع" onClick={() => speak(s.en, { rate: slow ? 0.6 : 0.85 })}>
            <Volume2 className="size-7" aria-hidden="true" />
          </Button>
        ) : (
          <p className="rounded-lg bg-warning-tint p-3 text-[13px] text-[#5C3D00]">جهازك لا يحتوي صوتاً إنجليزياً، فاقرأ الجملة بصوت عالٍ.</p>
        )}
        {showText || !canSpeak ? (
          <>
            <En as="p" className="text-xl leading-relaxed font-semibold">
              {s.en}
            </En>
            {s.ar && <p className="text-sm text-muted-foreground">{s.ar}</p>}
          </>
        ) : (
          <button type="button" className="min-h-10 text-sm font-semibold text-primary" onClick={() => setShowText(true)}>
            اعرض الجملة
          </button>
        )}
      </Card>
      <div className="flex gap-2">
        {canSpeak && (
          <Button variant="secondary" className="flex-1" onClick={() => setSlow(!slow)} aria-pressed={slow}>
            {slow ? "سرعة عادية" : "أبطأ"}
          </Button>
        )}
        <Button
          className="flex-[2]"
          onClick={() => {
            setIndex(index + 1);
            setShowText(false);
          }}
        >
          التالية
          <ChevronLeft className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
