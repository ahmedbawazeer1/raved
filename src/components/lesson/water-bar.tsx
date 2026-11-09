/** Progress as water filling a bar, with a small moving wave on its surface. */
export function WaterBar({ value, max, label = "التقدم" }: { value: number; max: number; label?: string }) {
  const pct = max ? Math.round((Math.min(value, max) / max) * 100) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className="relative h-4 w-full overflow-hidden rounded-full bg-muted"
    >
      <span
        className="water-fill absolute inset-y-0 start-0 overflow-hidden rounded-full bg-[linear-gradient(180deg,#6CCBF2,#2E9BD6)] transition-[width] duration-500 ease-[cubic-bezier(.34,1.56,.64,1)]"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
