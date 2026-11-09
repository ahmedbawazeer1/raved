import Link from "next/link";
import type { Watering } from "@shared/student/watering";

const DROP = (
  <svg viewBox="0 0 20 26" className="h-6 w-5" aria-hidden="true">
    <path d="M10 1C10 1 2 12 2 17a8 8 0 0 0 16 0C18 12 10 1 10 1Z" fill="#2E9BD6" />
    <ellipse cx="7" cy="16" rx="2" ry="3.5" fill="#fff" opacity=".6" />
  </svg>
);

/** Drops (points) and watering days as game-like chips (link to the progress page). */
export function Hud({ watering, drops }: { watering: Watering; drops: number }) {
  const chip =
    "flex min-h-11 items-center gap-1.5 rounded-2xl rounded-es-md border border-border bg-card px-3 font-en text-[15px] font-extrabold tabular-nums no-underline shadow-sm";
  const restLabel = watering.state === "rest" ? "، اليوم راحة" : "";
  return (
    <nav aria-label="إنجازاتك" className="flex items-center gap-2">
      <Link href="/student/progress" className={`${chip} text-[#1C6FA3] hover:text-[#1C6FA3]`} aria-label={`${watering.days} أيام سقاية${restLabel}`}>
        <svg viewBox="0 0 24 24" className="size-6" aria-hidden="true">
          <path d="M4 11h11a3 3 0 0 1 3 3v1H4z" fill="#2E9BD6" />
          <path d="M18 12l4-3" stroke="#1C6FA3" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M6 11V8a3 3 0 0 1 6 0" stroke="#1C6FA3" strokeWidth="2" fill="none" />
          <circle cx="21" cy="14" r="1.4" fill="#6CCBF2" />
          <circle cx="22.5" cy="17" r="1" fill="#6CCBF2" />
        </svg>
        {watering.days}
      </Link>
      <Link href="/student/progress#badges" className={`${chip} text-[#1C6FA3] hover:text-[#1C6FA3]`} aria-label={`${drops} قطرة`}>
        {DROP}
        {drops}
      </Link>
    </nav>
  );
}
