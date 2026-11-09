"use client";

import { Rafed } from "@/components/art/rafed";
import { GuardianArt } from "@/components/art/guardian";
import type { Guardian } from "@/lib/art/guardians";
import { cn } from "@/lib/utils";

/**
 * The battle with a stop's guardian: dusk over the Jol plateau, the guardian on its rock and the
 * companion facing it. `hp` is the guardian's health (0–100); `meter` replaces it during the quiz
 * (answers charge the attack, the score is known only after the server grades).
 */
export function BattleScene({
  guardian,
  hp,
  meter,
  outcome,
  compact = false,
}: {
  guardian: Guardian;
  hp?: number;
  meter?: { value: number; label: string };
  outcome?: "won" | "lost";
  compact?: boolean;
}) {
  const ko = outcome === "won";
  return (
    <div className={cn("relative overflow-hidden rounded-3xl text-white", compact ? "h-36" : "h-60")}>
      <svg viewBox="0 0 390 260" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full" aria-hidden="true">
        <rect width="390" height="260" fill="url(#art-dusk)" />
        <g fill="#fff" opacity=".7">
          <circle cx="40" cy="30" r="1.2" />
          <circle cx="120" cy="18" r="1" />
          <circle cx="210" cy="40" r="1.3" />
          <circle cx="330" cy="22" r="1" />
        </g>
        <circle cx="195" cy="168" r="70" fill="url(#art-sun)" />
        <circle cx="195" cy="168" r="26" fill="#FFD27A" />
        <path d="M0 170 L40 150 H110 L130 170 L170 160 L200 172 L250 148 H320 L345 168 L390 158 V260 H0Z" fill="#7A3E44" />
        <path d="M0 196 L60 178 H140 L165 198 L230 186 L280 172 H360 L390 190 V260 H0Z" fill="#5A2C35" />
        <path d="M0 226 Q195 200 390 226 V260 H0Z" fill="#3B1E26" />
        <ellipse cx="96" cy="232" rx="80" ry="14" fill="#2A141B" />
      </svg>
      <div className="absolute start-3 top-3 z-10 w-44 rounded-2xl bg-black/55 px-3 py-1.5 text-xs font-bold backdrop-blur-sm">
        <p>{guardian.name}</p>
        {meter ? (
          <>
            <p className="text-[10px] font-semibold opacity-75">{meter.label}</p>
            <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-gradient-to-l from-[#FFD36B] to-accent transition-[width] duration-500"
                style={{ width: `${meter.value}%` }}
              />
            </div>
          </>
        ) : (
          <>
            <p className="text-[10px] font-semibold opacity-75">صحة الحارس {hp ?? 100}/100</p>
            <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-white/20" role="img" aria-label={`صحة الحارس ${hp ?? 100}%`}>
              <div
                className="h-full rounded-full bg-gradient-to-l from-[#FF922B] to-[#FF6B6B] motion-safe:animate-[boss-hp_1.6s_ease-out_forwards]"
                style={{ ["--hp" as string]: `${hp ?? 100}%`, width: `${hp ?? 100}%` }}
              />
            </div>
          </>
        )}
      </div>
      <div
        className={cn(
          "absolute end-3 transition-all duration-1000",
          compact ? "top-2" : "top-10",
          ko && "translate-y-6 -rotate-[70deg] opacity-50",
          outcome === "lost" && "motion-safe:animate-[boss-hit_0.6s_ease-in-out_2]",
          outcome === "won" && "motion-safe:animate-[boss-hit_0.5s_ease-in-out_2]",
        )}
      >
        <GuardianArt id={guardian.id} ko={ko} size={compact ? 92 : 150} />
      </div>
      <div className={cn("absolute start-5 bottom-1", compact && "hidden")}>
        <Rafed
          mood={outcome === "won" ? "happy" : outcome === "lost" ? "sad" : "idle"}
          move={outcome === "won" ? "cheer" : outcome === "lost" ? "sad" : undefined}
          moveKey={outcome ?? undefined}
          size={84}
        />
      </div>
    </div>
  );
}
