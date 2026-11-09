import { cn } from "@/lib/utils";

const PALETTE: [string, string][] = [
  ["#18A383", "#0E6E5C"],
  ["#4DABF7", "#1864AB"],
  ["#69DB7C", "#2B8A3E"],
  ["#F59F00", "#D9480F"],
  ["#9775FA", "#5F3DC4"],
  ["#FF8787", "#C92A2A"],
];

const PERFORATION = "linear-gradient(#000 0 0) content-box, radial-gradient(circle at 5px 5px, transparent 2.6px, #000 3px) -5px -5px / 10px 10px";

/** A unit stamp (a blooming lily on water): coloured when earned, a grey outline when not yet. */
export function Stamp({ name, position, earned, className }: { name: string; position: number; earned: boolean; className?: string }) {
  const [light, dark] = PALETTE[(position - 1) % PALETTE.length];
  return (
    <div
      className={cn("relative aspect-[4/5] bg-card p-[5px] drop-shadow-[0_2px_3px_rgba(0,0,0,.18)]", className)}
      style={{ mask: PERFORATION, WebkitMask: PERFORATION }}
    >
      <div
        className={cn(
          "flex h-full flex-col items-center justify-center gap-0.5 rounded-[4px] text-center text-xs leading-tight font-extrabold",
          earned ? "text-white" : "bg-[repeating-linear-gradient(45deg,var(--color-background)_0_6px,var(--color-border)_6px_7px)] text-muted-foreground",
        )}
        style={earned ? { background: `linear-gradient(160deg, ${light}, ${dark})` } : undefined}
      >
        <svg viewBox="0 0 48 48" className={cn("size-11", earned ? "drop-shadow-[0_2px_2px_rgba(0,0,0,.25)]" : "opacity-35")} aria-hidden="true">
          <path d="M24 6C24 6 10 22 10 30a14 14 0 0 0 28 0C38 22 24 6 24 6Z" fill={earned ? "#fff" : "currentColor"} opacity={earned ? 0.95 : 0.5} />
          <text x="24" y="36" textAnchor="middle" fontSize="13" fontWeight="800" fontFamily="Inter, sans-serif" fill={earned ? dark : "#fff"}>
            {position}
          </text>
        </svg>
        <span>{name}</span>
        <span className="font-en text-[9px] font-semibold opacity-85">UNIT {position}</span>
      </div>
      {earned && (
        <span
          aria-hidden="true"
          className="absolute start-1.5 top-2 flex size-9 -rotate-[18deg] items-center justify-center rounded-full border-2 border-white/75 font-en text-[7px] font-extrabold text-white/90"
        >
          RAVED
        </span>
      )}
    </div>
  );
}
