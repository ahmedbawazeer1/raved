/**
 * A video block with an end_sec is a PART of its video (e.g. one episode split across a unit's
 * lessons): it is tracked per part (youtube id + start second, record_video_part), so watching one part
 * does not count for another. Blocks without end_sec keep whole-video tracking (record_video_watch).
 */
import type { VideoBlock } from "../content/types";

export function isVideoPart(b: Pick<VideoBlock, "end_sec">): boolean {
  return typeof b.end_sec === "number" && Number.isInteger(b.end_sec);
}

/** The key a block's watch progress is stored under ("abc@120" for a part, "abc" for a whole video). */
export function videoKey(b: Pick<VideoBlock, "youtube_id" | "start_sec" | "end_sec">): string {
  return isVideoPart(b) ? `${b.youtube_id}@${b.start_sec ?? 0}` : (b.youtube_id ?? "");
}

export interface VideoProgressRow {
  youtube_id: string;
  start_sec?: number;
  watched_sec: number;
  duration_sec: number;
  completed_at: string | null;
}

/** Progress by videoKey, from video_views (whole) and video_part_views (parts) rows. */
export function progressByKey(whole: VideoProgressRow[], parts: VideoProgressRow[]): Record<string, { watched: number; duration: number; done: boolean }> {
  const out: Record<string, { watched: number; duration: number; done: boolean }> = {};
  for (const v of whole) out[v.youtube_id] = { watched: v.watched_sec, duration: v.duration_sec, done: Boolean(v.completed_at) };
  for (const v of parts) out[`${v.youtube_id}@${v.start_sec ?? 0}`] = { watched: v.watched_sec, duration: v.duration_sec, done: Boolean(v.completed_at) };
  return out;
}
