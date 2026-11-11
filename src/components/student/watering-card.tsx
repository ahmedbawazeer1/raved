"use client";

import type { RafedStage } from "@shared/art/rafed";
import type { Watering } from "@shared/student/watering";
import { Rafed } from "@/components/art/rafed";
import { cn } from "@/lib/utils";

const DAYS = ["س", "ح", "ن", "ث", "ر", "خ", "ج"];

/** Rafed's state today (watered, waiting, thirsty, Friday rest) with this week's watering. */
export function WateringCard({ watering, stage, children }: { watering: Watering; stage: RafedStage; children: React.ReactNode }) {
  const mood = watering.state === "thirsty" ? "wilt" : watering.state === "rest" ? "sleep" : watering.state === "watered" ? "happy" : "idle";
  const move = watering.state === "watered" ? "hop" : watering.state === "waiting" || watering.state === "new" ? "wave" : undefined;
  return (
    <section
      aria-label="سقاية رافد"
      className={cn(
        "flex items-center gap-3 rounded-3xl rounded-es-lg border-2 p-3",
        watering.state === "thirsty"
          ? "border-[#E9CF98] bg-[#FBF5E9] dark:bg-[#3A3122]"
          : watering.state === "rest"
            ? "border-[#CBB5F7] bg-ai-tint"
            : "border-[#9FD3EE] bg-[#E0F1FA] dark:bg-[#10293A]",
      )}
    >
      <Rafed stage={stage} mood={mood} move={move} moveKey={move ? "today" : undefined} size={72} />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="text-sm leading-relaxed font-semibold">{children}</p>
        <WateringWeek watering={watering} />
      </div>
    </section>
  );
}

/** This week, Saturday → Friday (Friday is the rest day). */
export function WateringWeek({ watering }: { watering: Watering }) {
  return (
    <ol className="flex gap-1.5" aria-label="أسبوع السقاية">
      {DAYS.map((d, i) => {
        const on = watering.week[i];
        const fri = i === 6;
        return (
          <li key={d} className="flex flex-col items-center gap-0.5 text-[11px] font-bold text-[#1C6FA3]">
            <span
              className={cn(
                "flex size-7 items-center justify-center rounded-full border-2 border-[#9FD3EE] bg-card",
                i === watering.todayIndex && "ring-2 ring-[#2E9BD6]",
              )}
              aria-label={`${d}: ${on ? "سُقي" : fri ? "راحة" : "لا"}`}
            >
              {on ? (
                <svg viewBox="0 0 20 26" className="h-4 w-3" aria-hidden="true">
                  <path d="M10 1C10 1 2 12 2 17a8 8 0 0 0 16 0C18 12 10 1 10 1Z" fill="#2E9BD6" />
                </svg>
              ) : fri ? (
                <svg viewBox="0 0 24 24" className="size-3.5" aria-hidden="true">
                  <path d="M20 15A8 8 0 0 1 9 4a8 8 0 1 0 11 11z" fill="#7A52D6" />
                </svg>
              ) : null}
            </span>
            {d}
          </li>
        );
      })}
    </ol>
  );
}
