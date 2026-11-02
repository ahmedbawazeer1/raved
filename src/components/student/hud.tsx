import Link from "next/link";
import { playerLevel } from "@/lib/gamification/xp";

/** Streak, points and player level as game-like chips (links to the progress page). */
export function Hud({ streak, xp }: { streak: number; xp: number }) {
  const lvl = playerLevel(xp);
  const percent = Math.round((lvl.into / lvl.span) * 100);
  const chip =
    "flex min-h-11 items-center gap-1.5 rounded-full border border-border bg-card px-3 font-en text-[15px] font-extrabold tabular-nums no-underline shadow-sm";
  return (
    <nav aria-label="إنجازاتك" className="flex items-center gap-2">
      <Link href="/student/progress" className={`${chip} text-[#E8590C] hover:text-[#E8590C]`} aria-label={`${streak} أيام متتالية`}>
        <svg className="size-6" aria-hidden="true">
          <use href="#art-i-flame" />
        </svg>
        {streak}
      </Link>
      <Link href="/student/progress#badges" className={`${chip} text-warning hover:text-warning`} aria-label={`${xp} نقطة`}>
        <svg className="size-6" aria-hidden="true">
          <use href="#art-i-coin" />
        </svg>
        {xp}
      </Link>
      <Link
        href="/student/progress#badges"
        className="ms-auto flex min-h-11 items-center gap-2 rounded-full border border-border bg-card ps-1 pe-3 text-xs font-semibold text-muted-foreground no-underline shadow-sm hover:text-foreground"
        aria-label={`المستوى ${lvl.level}، ${percent}% إلى المستوى التالي`}
      >
        <span className="relative flex size-9 items-center justify-center">
          <svg className="absolute inset-0 size-9" viewBox="0 0 42 42" aria-hidden="true">
            <use href="#art-i-shield" />
          </svg>
          <span className="relative font-en text-sm font-extrabold text-white">{lvl.level}</span>
        </span>
        <span className="flex w-14 flex-col gap-1">
          المستوى
          <span className="h-1.5 overflow-hidden rounded-full bg-muted">
            <span className="block h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
          </span>
        </span>
      </Link>
    </nav>
  );
}
