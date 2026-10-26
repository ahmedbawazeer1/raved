"use client";

/** English text read aloud by the phone's own voice (speechSynthesis): no data used, works offline. */
import { useSyncExternalStore } from "react";

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

/** null before hydration, then whether speechSynthesis exists. */
export function useSpeechSupported(): boolean | null {
  return useSyncExternalStore(noopSubscribe, () => "speechSynthesis" in window, () => null);
}

export function useEnglishVoice(): boolean {
  return useSyncExternalStore(subscribeVoices, englishVoiceSnapshot, () => true);
}

/** Speaks `text`; calls onEnd when finished or failed. Returns a function that stops it. */
export function speak(text: string, { rate = 0.9, onEnd }: { rate?: number; onEnd?: () => void } = {}): () => void {
  const synth = window.speechSynthesis;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = rate;
  const voice = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith("en"));
  if (voice) u.voice = voice;
  u.onend = () => onEnd?.();
  u.onerror = () => onEnd?.();
  synth.cancel();
  synth.speak(u);
  return () => synth.cancel();
}
