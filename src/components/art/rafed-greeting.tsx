"use client";

import type { RafedStage } from "@shared/art/rafed";
import { Rafed } from "@/components/art/rafed";

/** Rafed with a speech bubble. */
export function RafedGreeting({ children, stage = 1 }: { children: React.ReactNode; stage?: RafedStage }) {
  return (
    <div className="flex items-end gap-2">
      <Rafed stage={stage} mood="happy" move="wave" moveKey="hello" size={64} />
      <div className="relative mb-3 min-w-0 flex-1 rounded-2xl rounded-es-sm border-2 border-border bg-card px-3.5 py-2.5 text-sm leading-relaxed font-semibold">
        <span className="sr-only">رافد: </span>
        {children}
      </div>
    </div>
  );
}
