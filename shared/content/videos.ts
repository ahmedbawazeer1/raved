/** YouTube ids used by lessons (pure, unit tested). */
import type { LessonBlock } from "./types";

export const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

/** Hosts whose video files our own player may play (public-domain VOA Learning English). */
export const NATIVE_VIDEO_HOSTS = ["voa-video.voanews.eu"];
/** True for an https video file on an allowed host. */
export function isNativeVideoUrl(url: unknown): url is string {
  if (typeof url !== "string") return false;
  try {
    const u = new URL(url);
    return u.protocol === "https:" && NATIVE_VIDEO_HOSTS.includes(u.hostname) && /\.mp4$/.test(u.pathname);
  } catch {
    return false;
  }
}

export function videoIds(lessons: { blocks: unknown }[]): string[] {
  const ids = new Set<string>();
  for (const l of lessons) {
    for (const b of (Array.isArray(l.blocks) ? l.blocks : []) as LessonBlock[]) {
      // Files played by our own player are not on YouTube: nothing to check there.
      if (b?.type === "video" && b.youtube_id && !b.video_url && YOUTUBE_ID.test(b.youtube_id)) ids.add(b.youtube_id);
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
