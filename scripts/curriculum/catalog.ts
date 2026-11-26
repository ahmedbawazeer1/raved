/**
 * npm run curriculum:catalog — prints the video catalog for the A1 MVP from YouTube's official API
 * (title, length, embeddable, start of the description). Nobody watches anything: a video is trusted
 * because of its channel (ZAmericanEnglish, VOA Learning English), and checked by its metadata only.
 * Needs YOUTUBE_API_KEY (repository secret; workflow .github/workflows/catalog.yml).
 */
import { isoDurationSeconds } from "../../src/lib/agent/youtube";

const KEY = process.env.YOUTUBE_API_KEY?.trim();
const API = "https://www.googleapis.com/youtube/v3";
const get = async <T>(path: string, params: Record<string, string>): Promise<T> => {
  const url = `${API}/${path}?${new URLSearchParams({ ...params, key: KEY! })}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${path} ${res.status} ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as T;
};

interface Item { contentDetails?: { videoId?: string }; snippet?: { resourceId?: { videoId?: string } } }
async function playlist(id: string): Promise<string[]> {
  const out: string[] = [];
  let page = "";
  do {
    const r = await get<{ items: Item[]; nextPageToken?: string }>("playlistItems", { part: "snippet", playlistId: id, maxResults: "50", ...(page ? { pageToken: page } : {}) });
    out.push(...r.items.map((i) => i.snippet?.resourceId?.videoId ?? "").filter(Boolean));
    page = r.nextPageToken ?? "";
  } while (page);
  return out;
}
interface Vid { id: string; snippet: { title: string; channelTitle: string; description: string }; contentDetails: { duration: string }; status: { embeddable: boolean; privacyStatus: string } }
async function details(ids: string[]): Promise<Vid[]> {
  const out: Vid[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const r = await get<{ items: Vid[] }>("videos", { part: "snippet,contentDetails,status", id: ids.slice(i, i + 50).join(",") });
    out.push(...r.items);
  }
  return out;
}
const line = (v: Vid, desc: number) =>
  `${v.id} | ${Math.round(isoDurationSeconds(v.contentDetails.duration) / 60)}m | ${v.status.embeddable && v.status.privacyStatus === "public" ? "OK" : "NO-EMBED"} | ${v.snippet.title}${desc ? ` | ${v.snippet.description.replace(/\s+/g, " ").slice(0, desc)}` : ""}`;

async function main() {
  if (!KEY) throw new Error("YOUTUBE_API_KEY is not set");
  console.log("== ZAmericanEnglish playlist (A1) ==");
  const z = await details(await playlist("PLp22-4PivYmIFAnru_L7fnMhSV5YffLTZ"));
  z.forEach((v, i) => console.log(`${String(i + 1).padStart(2, "0")} ${line(v, 220)}`));

  console.log("\n== VOA Learning English: Let's Learn English Level 1 ==");
  const ch = await get<{ items: { id: string }[] }>("channels", { part: "id", forHandle: "voalearningenglish" });
  const channelId = ch.items[0]?.id;
  if (!channelId) throw new Error("VOA channel not found");
  const ids = new Set<string>();
  for (const q of ["Let's Learn English Level 1 Lesson", "Let's Learn English Level 1"]) {
    let page = "";
    for (let n = 0; n < 3; n++) {
      const r = await get<{ items: { id: { videoId?: string } }[]; nextPageToken?: string }>("search", { part: "id", channelId, q, type: "video", maxResults: "50", ...(page ? { pageToken: page } : {}) });
      r.items.forEach((i) => i.id.videoId && ids.add(i.id.videoId));
      page = r.nextPageToken ?? "";
      if (!page) break;
    }
  }
  const voa = (await details([...ids])).filter((v) => /let.?s learn english/i.test(v.snippet.title) && /level 1/i.test(v.snippet.title + v.snippet.description));
  voa.sort((a, b) => Number(a.snippet.title.match(/lesson (\d+)/i)?.[1] ?? 999) - Number(b.snippet.title.match(/lesson (\d+)/i)?.[1] ?? 999));
  voa.forEach((v) => console.log(line(v, 0)));
  console.log(`\nVOA videos: ${voa.length}`);
}
void main();
