"use client";

import { useState, useSyncExternalStore } from "react";
import { BookOpen, CheckCircle2, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { En } from "@/components/en";
import { markSolved, solvedStore } from "@/lib/gamification/events";
import { speak } from "@/lib/tts";
import { cn } from "@/lib/utils";

type Panel = { speaker: string; text_en: string; text_ar: string };

// The two travellers of the story keep their colours on every episode.
const SIDE: Record<string, string> = { Hamza: "start", Reem: "end" };
const AVATAR: Record<string, string> = { Hamza: "🧑🏽", Reem: "🧕🏽" };

/** «رحلة حمزة وريم»: one episode per unit, revealed line by line. Reading to the end counts as an activity. */
export function StoryBlock({ id, title, panels }: { id: string; title?: string; panels: Panel[] }) {
  const solved = solvedStore.parse(useSyncExternalStore(solvedStore.subscribe, solvedStore.getSnapshot, solvedStore.getServerSnapshot)).has(id);
  const [shown, setShown] = useState(1);
  const [arabic, setArabic] = useState(false);
  const visible = solved ? panels.length : shown;
  const end = visible >= panels.length;

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        <BookOpen className="size-5 text-primary" aria-hidden="true" />
        <div className="flex-1">
          <p className="text-xs font-semibold text-primary">قصة الرحلة · حمزة وريم</p>
          <h3 className="font-bold">{title}</h3>
        </div>
        {solved && <CheckCircle2 className="size-6 text-success" aria-label="قرأتها" />}
      </div>
      <ol className="flex flex-col gap-2.5" aria-live="polite">
        {panels.slice(0, visible).map((p, i) => {
          const side = SIDE[p.speaker] ?? "center";
          return (
            <li key={i} className={cn("flex items-end gap-2", side === "end" && "flex-row-reverse", side === "center" && "justify-center")}>
              <span className="text-2xl" aria-hidden="true">
                {AVATAR[p.speaker] ?? "🧔🏽"}
              </span>
              <div className={cn("max-w-[80%] rounded-2xl px-3.5 py-2.5", side === "end" ? "bg-warning-tint" : side === "start" ? "bg-primary-tint" : "bg-muted")}>
                <p className="text-xs font-semibold text-muted-foreground">{p.speaker === "Hamza" ? "حمزة" : p.speaker === "Reem" ? "ريم" : <En>{p.speaker}</En>}</p>
                <button type="button" onClick={() => speak(p.text_en, { rate: 0.85 })} className="flex items-start gap-1.5 text-start">
                  <En className="text-[16px] leading-relaxed">{p.text_en}</En>
                  <Volume2 className="mt-1 size-3.5 flex-none text-muted-foreground" aria-label="استمع" />
                </button>
                {arabic && <p className="text-sm text-muted-foreground">{p.text_ar}</p>}
              </div>
            </li>
          );
        })}
      </ol>
      <div className="flex flex-wrap gap-2">
        {!end ? (
          <Button type="button" onClick={() => setShown(shown + 1)}>
            التالي ({visible} من {panels.length})
          </Button>
        ) : (
          !solved && (
            <Button type="button" onClick={() => markSolved(id)}>
              أنهيت الحلقة ✓
            </Button>
          )
        )}
        <Button type="button" variant="secondary" onClick={() => setArabic(!arabic)}>
          {arabic ? "أخفِ الترجمة" : "أظهر الترجمة"}
        </Button>
      </div>
    </Card>
  );
}
