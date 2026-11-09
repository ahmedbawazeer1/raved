"use client";

import { useEffect, useState } from "react";
import { resultText, type League } from "@shared/gamification/league";
import { leagueResultSeen } from "@/app/(student)/student/league/actions";
import { Celebrate } from "@/components/art/celebrate";
import { Rafed } from "@/components/art/rafed";
import { Button } from "@/components/ui/button";
import { fx } from "@/lib/fx";
import { TierBadge } from "./tier-badge";

/** Friday's announcement (up, stay or down), shown once. Encouraging, never blaming. */
export function LeagueResult({ result }: { result: NonNullable<League["result"]> }) {
  const [open, setOpen] = useState(true);
  const t = resultText(result);
  useEffect(() => {
    fx(result.outcome === "up" ? "level" : "ripple");
  }, [result.outcome]);
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="league-result"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-3 sm:items-center"
    >
      <div className="relative flex w-full max-w-sm flex-col items-center gap-3 overflow-hidden rounded-3xl bg-card p-6 text-center shadow-xl motion-safe:animate-[sheet-up_.35s_ease-out]">
        {result.outcome === "up" && <Celebrate id="league" />}
        <small className="font-semibold text-muted-foreground">إعلان الجمعة</small>
        <div className="flex items-end gap-2">
          {result.outcome !== "stay" && <TierBadge tier={result.from_tier} size={48} />}
          {result.outcome !== "stay" && <span className="pb-4 text-2xl text-muted-foreground">←</span>}
          <TierBadge tier={result.to_tier} size={80} />
        </div>
        <h2 id="league-result" className="text-2xl font-bold">
          {t.title}
        </h2>
        <p className="text-muted-foreground">{t.body}</p>
        {result.rank && (
          <p className="text-sm">
            ترتيبك: <b className="font-en">{result.rank}</b> · <b className="font-en">{result.xp ?? 0}</b> قطرة
          </p>
        )}
        <Rafed size={70} stage={3} mood={result.outcome === "up" ? "happy" : "idle"} move={result.outcome === "up" ? "cheer" : "nod"} moveKey={1} />
        <Button
          size="lg"
          className="w-full"
          onClick={() => {
            setOpen(false);
            void leagueResultSeen();
          }}
        >
          متابعة
        </Button>
      </div>
    </div>
  );
}
