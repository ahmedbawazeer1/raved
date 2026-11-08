/** YouTube ids used by lessons (pure, unit tested). */
import type { LessonBlock } from "./types";

export const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

export function videoIds(lessons: { blocks: unknown }[]): string[] {
  const ids = new Set<string>();
  for (const l of lessons) {
    for (const b of (Array.isArray(l.blocks) ? l.blocks : []) as LessonBlock[]) {
      if (b?.type === "video" && b.youtube_id && YOUTUBE_ID.test(b.youtube_id)) ids.add(b.youtube_id);
    }
  }
  return [...ids];
}

/** oEmbed answers 200 for embeddable public videos; 401/403 (embedding off) and 404 (gone/private) are broken. */
export function oembedStatus(httpStatus: number): "ok" | "broken" | "unknown" {
  if (httpStatus === 200) return "ok";
  if ([400, 401, 403, 404].includes(httpStatus)) return "broken";
  return "unknown";
}
