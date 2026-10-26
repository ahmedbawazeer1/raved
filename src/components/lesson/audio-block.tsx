"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Pause, Play } from "lucide-react";
import { Card } from "@/components/ui/card";
import { En } from "@/components/en";

const RATES = [0.8, 1, 0.6] as const;

/** Listening text read aloud by the phone's own voice (speechSynthesis): no data used, works offline. */
const noopSubscribe = () => () => {};
function subscribeVoices(onChange: () => void) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return () => {};
  window.speechSynthesis.addEventListener?.("voiceschanged", onChange);
  return () => window.speechSynthesis.removeEventListener?.("voiceschanged", onChange);
}
function englishVoiceSnapshot(): boolean {
  if (!("speechSynthesis" in window)) return false;
  const voices = window.speechSynthesis.getVoices();
  // Some browsers load voices lazily: assume available until the list says otherwise.
  return voices.length === 0 || voices.some((v) => v.lang.toLowerCase().startsWith("en"));
}

export function AudioBlock({ text }: { text: string }) {
  const supported = useSyncExternalStore(noopSubscribe, () => "speechSynthesis" in window, () => null);
  const hasEnglishVoice = useSyncExternalStore(subscribeVoices, englishVoiceSnapshot, () => true);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState<(typeof RATES)[number]>(0.8);
  const [showText, setShowText] = useState(false);
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);

  // Stop speaking when the student leaves the lesson.
  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  function toggle() {
    const synth = window.speechSynthesis;
    if (playing) {
      synth.cancel();
      setPlaying(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = rate;
    const voice = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith("en"));
    if (voice) u.voice = voice;
    u.onend = () => setPlaying(false);
    u.onerror = () => setPlaying(false);
    utterance.current = u;
    synth.cancel();
    synth.speak(u);
    setPlaying(true);
  }

  const canPlay = supported && hasEnglishVoice;
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          disabled={!canPlay}
          aria-label={playing ? "إيقاف" : "استمع"}
          className="flex size-12 flex-none items-center justify-center rounded-xl bg-primary text-white disabled:opacity-50"
        >
          {playing ? <Pause className="size-6" aria-hidden="true" /> : <Play className="size-6" aria-hidden="true" />}
        </button>
        <div className="flex-1">
          <p className="font-semibold">استمع للنص</p>
          <p className="text-[13px] text-muted-foreground">بصوت جهازك · يعمل بلا إنترنت</p>
        </div>
        <button
          type="button"
          onClick={() => setRate(RATES[(RATES.indexOf(rate) + 1) % RATES.length])}
          className="min-h-11 rounded-full bg-muted px-3 font-en text-xs font-semibold text-subtle"
          aria-label="سرعة القراءة"
        >
          {rate}×
        </button>
      </div>
      {supported === false || !hasEnglishVoice ? (
        <p className="rounded-lg bg-warning-tint p-3 text-[13px] leading-relaxed text-[#5C3D00]">
          جهازك لا يحتوي صوتاً إنجليزياً. اقرأ النص أدناه، أو ثبّت الصوت من: الإعدادات ← اللغة ← تحويل النص إلى كلام.
        </p>
      ) : null}
      {(showText || supported === false || !hasEnglishVoice) ? (
        <En as="p" className="rounded-lg bg-background p-3 text-[15px] leading-relaxed whitespace-pre-line">
          {text}
        </En>
      ) : (
        <button type="button" onClick={() => setShowText(true)} className="min-h-9 self-start text-sm font-semibold text-primary">
          اعرض النص
        </button>
      )}
    </Card>
  );
}
