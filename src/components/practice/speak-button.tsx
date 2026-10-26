"use client";

import { Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { speak, useEnglishVoice, useSpeechSupported } from "@/lib/tts";

/** Reads English text aloud with the phone's voice (offline, no data). */
export function SpeakButton({ text, label = "استمع" }: { text: string; label?: string }) {
  const supported = useSpeechSupported();
  const hasVoice = useEnglishVoice();
  if (supported === false || !hasVoice) return null;
  return (
    <Button type="button" variant="secondary" size="sm" className="self-start" onClick={() => speak(text, { rate: 0.85 })}>
      <Volume2 className="size-4" aria-hidden="true" />
      {label}
    </Button>
  );
}
