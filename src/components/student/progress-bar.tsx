export function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} className="h-2 flex-1 overflow-hidden rounded-full bg-border">
      <span className="block h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
    </div>
  );
}
