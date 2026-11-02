/**
 * YouTube Data API v3 search for the content agent (free quota; a search costs 100 units of the
 * 10,000 a day). Only embeddable videos are kept: students watch through YouTube's own player.
 */
export interface VideoCandidate {
  id: string;
  title: string;
  channel: string;
  description: string;
  durationSec: number;
  captions: boolean;
  views: number;
}

/** ISO 8601 duration (PT1H2M3S) → seconds. */
export function isoDurationSeconds(iso: string): number {
  const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!m) return 0;
  const [, d, h, min, s] = m.map((x) => Number(x ?? 0));
  return d * 86400 + h * 3600 + min * 60 + s;
}

interface SearchResponse {
  items?: { id?: { videoId?: string } }[];
}
interface VideosResponse {
  items?: {
    id: string;
    snippet?: { title?: string; channelTitle?: string; description?: string };
    contentDetails?: { duration?: string; caption?: string };
    status?: { embeddable?: boolean; privacyStatus?: string };
    statistics?: { viewCount?: string };
  }[];
}

export async function searchYouTube(query: string, opts: { apiKey?: string; max?: number; minSec?: number; maxSec?: number } = {}): Promise<VideoCandidate[]> {
  const key = opts.apiKey ?? process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error("YOUTUBE_API_KEY is missing");
  const params = new URLSearchParams({
    part: "snippet",
    q: query,
    type: "video",
    maxResults: String(opts.max ?? 8),
    videoEmbeddable: "true",
    safeSearch: "strict",
    relevanceLanguage: "en",
    key,
  });
  const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`YouTube search ${res.status}`);
  const ids = ((await res.json()) as SearchResponse).items?.map((i) => i.id?.videoId).filter((x): x is string => Boolean(x)) ?? [];
  if (ids.length === 0) return [];
  const details = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?${new URLSearchParams({ part: "snippet,contentDetails,status,statistics", id: ids.join(","), key })}`,
    { signal: AbortSignal.timeout(20_000) },
  );
  if (!details.ok) throw new Error(`YouTube videos ${details.status}`);
  const minSec = opts.minSec ?? 90;
  const maxSec = opts.maxSec ?? 15 * 60;
  return (((await details.json()) as VideosResponse).items ?? [])
    .filter((v) => v.status?.embeddable !== false && v.status?.privacyStatus === "public")
    .map((v) => ({
      id: v.id,
      title: v.snippet?.title ?? "",
      channel: v.snippet?.channelTitle ?? "",
      description: (v.snippet?.description ?? "").slice(0, 400),
      durationSec: isoDurationSeconds(v.contentDetails?.duration ?? ""),
      captions: v.contentDetails?.caption === "true",
      views: Number(v.statistics?.viewCount ?? 0),
    }))
    .filter((v) => v.durationSec >= minSec && v.durationSec <= maxSec);
}
