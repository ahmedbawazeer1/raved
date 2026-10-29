import Link from "next/link";
import { Star } from "lucide-react";
import { playerLevel } from "@/lib/gamification/xp";

/** Points and player level, with progress to the next level. */
export function XpBar({ xp }: { xp: number }) {
  const lvl = playerLevel(xp);
  const percent = Math.round((lvl.into / lvl.span) * 100);
  return (
    <Link
      href="/student/progress#badges"
      className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 text-foreground no-underline hover:border-primary hover:text-foreground"
    >
      <span className="flex size-11 flex-none items-center justify-center rounded-full bg-accent text-[#5C3D00]">
        <Star className="size-6 fill-current" aria-hidden="true" />
      </span>
      <span className="flex flex-1 flex-col gap-1">
        <span className="flex justify-between text-sm">
          <span className="font-bold">المستوى {lvl.level}</span>
          <span className="font-en font-semibold">{xp} XP</span>
        </span>
        <span className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="التقدم إلى المستوى التالي">
          <span className="block h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
        </span>
        <span className="text-xs text-muted-foreground">{lvl.span - lvl.into} نقطة للمستوى {lvl.level + 1} · شاهد أوسمتك</span>
      </span>
    </Link>
  );
}
