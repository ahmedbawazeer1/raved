"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Lock } from "lucide-react";
import { Companion } from "@/components/art/companion";
import { VIDEO_DONE } from "@/lib/gamification/events";
import { prefsStore } from "@/lib/fx";

/** The rest of the lesson opens once the lesson video is watched (the video comes first). */
export function VideoFirst({ done: initialDone, children }: { done: boolean; children: React.ReactNode }) {
  const prefs = useSyncExternalStore(prefsStore.subscribe, prefsStore.getSnapshot, prefsStore.getServerSnapshot);
  const [done, setDone] = useState(initialDone);
  useEffect(() => {
    const onDone = () => setDone(true);
    window.addEventListener(VIDEO_DONE, onDone);
    return () => window.removeEventListener(VIDEO_DONE, onDone);
  }, []);

  if (done) return <div className="flex flex-col gap-4 motion-safe:animate-[rise-in_.4s]">{children}</div>;
  return (
    <div className="flex flex-col items-center gap-2 rounded-3xl border-2 border-dashed border-border bg-card/60 px-4 py-6 text-center">
      <div className="relative">
        <Companion who={prefs.companion} mood="think" size={60} />
        <span className="absolute -end-2 bottom-2 flex size-7 items-center justify-center rounded-full bg-muted text-subtle">
          <Lock className="size-4" aria-hidden="true" />
        </span>
      </div>
      <p className="font-bold">بقية الدرس تُفتح بعد الفيديو</p>
      <p className="text-sm text-muted-foreground">الشرح والتمارين والمهام بانتظارك. شاهد 80% من الفيديو وأجب عن الأسئلة المفاجئة.</p>
    </div>
  );
}
