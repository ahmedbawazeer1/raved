import { Card } from "@/components/ui/card";
import type { Badge } from "@/lib/gamification/xp";
import { cn } from "@/lib/utils";

/** Earned badges in colour, the rest greyed with their progress. */
export function BadgeGrid({ badges }: { badges: Badge[] }) {
  const earned = badges.filter((b) => b.earned).length;
  return (
    <Card id="badges" className="flex scroll-mt-20 flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold">أوسمتك</h2>
        <span className="text-sm text-muted-foreground">
          {earned} من {badges.length}
        </span>
      </div>
      <ul className="grid grid-cols-3 gap-2.5">
        {badges.map((b) => (
          <li
            key={b.id}
            className={cn("flex flex-col items-center gap-1 rounded-xl p-2.5 text-center", b.earned ? "bg-warning-tint" : "bg-muted")}
          >
            <span className={cn("text-3xl", !b.earned && "opacity-40 grayscale")} aria-hidden="true">
              {b.icon}
            </span>
            <span className={cn("text-[13px] font-bold leading-tight", !b.earned && "text-muted-foreground")}>{b.title}</span>
            <span className="text-[11px] leading-tight text-muted-foreground">{b.description}</span>
            {!b.earned && (
              <span className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-border" aria-label={`التقدم ${Math.round(b.progress * 100)}%`}>
                <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.round(b.progress * 100)}%` }} />
              </span>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
