/**
 * YouTube Data API v3 search for the content agent (free quota; a search costs 100 units of the
 * 10,000 a day). Only embeddable videos are kept: students watch through YouTube's own player.
 */
/** A YouTube API problem: "quota" (daily units used up) waits for tomorrow, "config" needs the owner (key or API settings). */
export class YouTubeError extends Error {
  constructor(
    public code: "quota" | "config" | "network",
    message: string,
  ) {
    super(message);
  }
}

/** Reads YouTube's error body: {"error": {"message": "...", "errors": [{"reason": "keyInvalid"}]}}. */
export async function youtubeError(res: Response, what: string): Promise<YouTubeError> {
  let reason = "";
  let message = "";
  try {
    const body = (await res.json()) as { error?: { message?: string; errors?: { reason?: string }[] } };
    reason = body.error?.errors?.[0]?.reason ?? "";
    message = body.error?.message ?? "";
  } catch {
    // not JSON
  }
  const detail = `YouTube ${what} ${res.status}${reason ? ` ${reason}` : ""}${message ? `: ${message.slice(0, 200)}` : ""}`;
  if (/quota|rateLimit/i.test(reason)) return new YouTubeError("quota", detail);
  if (res.status === 400 || res.status === 401 || res.status === 403) return new YouTubeError("config", detail);
  return new YouTubeError("network", detail);
}

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

export async function searchYouTube(
  query: string,
  opts: { apiKey?: string; max?: number; minSec?: number; maxSec?: number; channelId?: string; language?: "ar" | "en" } = {},
): Promise<VideoCandidate[]> {
  // Trimmed: a key pasted into GitHub secrets often carries a trailing space or newline.
  const key = (opts.apiKey ?? process.env.YOUTUBE_API_KEY)?.trim();
  if (!key) throw new Error("YOUTUBE_API_KEY is missing");
  const params = new URLSearchParams({
    part: "snippet",
    q: query,
    type: "video",
    maxResults: String(opts.max ?? 8),
    videoEmbeddable: "true",
    safeSearch: "strict",
    relevanceLanguage: opts.language ?? "en",
    ...(opts.channelId ? { channelId: opts.channelId } : {}),
    key,
  });
  const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw await youtubeError(res, "search");
  const ids = ((await res.json()) as SearchResponse).items?.map((i) => i.id?.videoId).filter((x): x is string => Boolean(x)) ?? [];
  if (ids.length === 0) return [];
  const details = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?${new URLSearchParams({ part: "snippet,contentDetails,status,statistics", id: ids.join(","), key })}`,
    { signal: AbortSignal.timeout(20_000) },
  );
  if (!details.ok) throw await youtubeError(details, "videos");
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

interface PlaylistResponse {
  nextPageToken?: string;
  items?: { snippet?: { title?: string; position?: number; resourceId?: { videoId?: string } } }[];
}

/** The videos of a playlist in order (playlistItems costs 1 unit per page of 50, not 100 like a search). */
export async function playlistVideos(playlistId: string, max = 60): Promise<{ youtube_id: string; title: string }[]> {
  const key = process.env.YOUTUBE_API_KEY?.trim();
  if (!key) throw new YouTubeError("config", "YOUTUBE_API_KEY is not set");
  const out: { youtube_id: string; title: string }[] = [];
  let page = "";
  for (let i = 0; i < 3 && out.length < max; i++) {
    const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
    url.search = new URLSearchParams({ part: "snippet", maxResults: "50", playlistId, key, ...(page ? { pageToken: page } : {}) }).toString();
    let res: Response;
    try {
      res = await fetch(url);
    } catch (e) {
      throw new YouTubeError("network", `YouTube playlist: ${e instanceof Error ? e.message : String(e)}`);
    }
    if (!res.ok) throw await youtubeError(res, "playlist");
    const body = (await res.json()) as PlaylistResponse;
    for (const item of body.items ?? []) {
      const id = item.snippet?.resourceId?.videoId;
      const title = item.snippet?.title ?? "";
      // Deleted or private videos stay in playlists with these titles: skip them.
      if (id && /^[A-Za-z0-9_-]{11}$/.test(id) && !/^(Deleted|Private) video$/.test(title)) out.push({ youtube_id: id, title });
    }
    if (!body.nextPageToken) break;
    page = body.nextPageToken;
  }
  return out.slice(0, max);
}

/** A channel id from a stored source reference (UC… as is, @handle through channels?forHandle: 1 unit). */
export async function resolveChannel(ref: string): Promise<string | null> {
  if (/^UC[A-Za-z0-9_-]{22}$/.test(ref)) return ref;
  if (!ref.startsWith("@")) return null;
  const key = process.env.YOUTUBE_API_KEY?.trim();
  if (!key) throw new YouTubeError("config", "YOUTUBE_API_KEY is not set");
  const res = await fetch(`https://www.googleapis.com/youtube/v3/channels?${new URLSearchParams({ part: "id", forHandle: ref, key })}`, {
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw await youtubeError(res, "channels");
  const body = (await res.json()) as { items?: { id?: string }[] };
  return body.items?.[0]?.id ?? null;
}
