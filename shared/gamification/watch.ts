/**
 * Seconds of a video the student actually played, as merged [start, end) ranges.
 * Skipping ahead does not count: only seconds seen while playing are added.
 */
export type WatchRanges = [number, number][];

/** Adds the played second `sec` (an integer) to the ranges. */
export function addSecond(ranges: WatchRanges, sec: number): WatchRanges {
  const s = Math.max(0, Math.floor(sec));
  const merged: WatchRanges = [];
  let placed = false;
  for (const [a, b] of [...ranges].sort((x, y) => x[0] - y[0])) {
    if (!placed && s + 1 < a) {
      merged.push([s, s + 1]);
      placed = true;
    }
    if (!placed && s >= a - 1 && s <= b) {
      merged.push([Math.min(a, s), Math.max(b, s + 1)]);
      placed = true;
      continue;
    }
    const last = merged[merged.length - 1];
    if (last && a <= last[1]) last[1] = Math.max(last[1], b);
    else merged.push([a, b]);
  }
  if (!placed) merged.push([s, s + 1]);
  return merged;
}

export function watchedSeconds(ranges: WatchRanges): number {
  return ranges.reduce((sum, [a, b]) => sum + (b - a), 0);
}

/** Share of the video watched, 0–100. */
export function watchedPercent(watched: number, duration: number): number {
  if (duration <= 0) return 0;
  return Math.min(100, Math.round((watched / duration) * 100));
}

/** Same rule as the server: a video counts as watched at 80%. */
export function videoDone(watched: number, duration: number): boolean {
  return duration > 0 && watched >= Math.ceil(duration * 0.8);
}

export function parseRanges(text: string | null): WatchRanges {
  try {
    const data = JSON.parse(text ?? "[]");
    return Array.isArray(data) ? data.filter((r) => Array.isArray(r) && r.length === 2 && r.every(Number.isFinite)) : [];
  } catch {
    return [];
  }
}
