"use client";

import { useSyncExternalStore } from "react";
import { Companion } from "@/components/art/companion";
import { COMPANIONS } from "@/lib/art/companion";
import { prefsStore } from "@/lib/fx";

/** The chosen companion (Hamza or Reem) with a speech bubble. */
export function CompanionGreeting({ children }: { children: React.ReactNode }) {
  const prefs = useSyncExternalStore(prefsStore.subscribe, prefsStore.getSnapshot, prefsStore.getServerSnapshot);
  const name = COMPANIONS.find((c) => c.id === prefs.companion)?.name;
  return (
    <div className="flex items-end gap-2">
      <Companion who={prefs.companion} mood="happy" wave size={64} />
      <div className="relative mb-3 min-w-0 flex-1 rounded-2xl border-2 border-border bg-card px-3.5 py-2.5 text-sm leading-relaxed font-semibold before:absolute before:start-[-8px] before:bottom-4 before:size-3.5 before:-rotate-45 before:border-b-2 before:border-s-2 before:border-border before:bg-card">
        <span className="sr-only">{name}: </span>
        {children}
      </div>
    </div>
  );
}
