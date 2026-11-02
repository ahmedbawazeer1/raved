"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Companion } from "@/components/art/companion";
import { Button } from "@/components/ui/button";
import { prefsStore } from "@/lib/fx";
import type { PackageQuestion } from "@/lib/content/types";
import { mistakesStore, parseMistakes } from "@/lib/mistakes";
import { ExerciseStepper } from "./exercise-stepper";

/** Replays the exercises the student got wrong (saved on this device). */
export function MistakesReview() {
  const prefs = useSyncExternalStore(prefsStore.subscribe, prefsStore.getSnapshot, prefsStore.getServerSnapshot);
  const raw = useSyncExternalStore(mistakesStore.subscribe, mistakesStore.getSnapshot, mistakesStore.getServerSnapshot);
  // The round's list is frozen when it starts, so corrected items do not vanish mid-review.
  const [round, setRound] = useState<PackageQuestion[] | null>(null);
  const list = parseMistakes(raw);
  if (round) return <ExerciseStepper exercises={round} mode="review" />;
  if (list.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-3xl border border-border bg-card p-6 text-center">
        <Companion who={prefs.companion} headwear={prefs.headwear} hijab={prefs.hijab} mood="happy" wave size={80} />
        <p className="font-bold">لا توجد أخطاء لتراجعها 👏</p>
        <p className="text-sm text-muted-foreground">كل تمرين تخطئ فيه داخل الدروس يُحفظ هنا لتتدرّب عليه.</p>
        <Link href="/student" className="text-sm">
          إلى اليوم ←
        </Link>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-border bg-card p-6 text-center">
      <Companion who={prefs.companion} headwear={prefs.headwear} hijab={prefs.hijab} mood="think" size={80} />
      <p className="font-bold">عندك {list.length} تمرين أخطأت فيه</p>
      <p className="text-sm text-muted-foreground">أجب عنها صحيحة لتخرج من القائمة.</p>
      <Button type="button" className="min-h-12 w-full" onClick={() => setRound(list)}>
        ابدأ المراجعة
      </Button>
    </div>
  );
}
