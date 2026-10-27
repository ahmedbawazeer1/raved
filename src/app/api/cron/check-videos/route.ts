import { NextResponse, type NextRequest } from "next/server";
import { oembedStatus, videoIds } from "@/lib/content/videos";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

/**
 * Weekly (Vercel Cron): checks every YouTube video used in a lesson through YouTube's public
 * oEmbed endpoint (no key, no video data downloaded) and records ok/broken in `sources`.
 * Broken links show on the admin home and reports pages. Requires CRON_SECRET when set.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: lessons, error } = await supabase.from("lessons").select("blocks").eq("archived", false);
  if (error) return NextResponse.json({ error: "query_failed" }, { status: 500 });
  const ids = videoIds(lessons ?? []).slice(0, 200);

  const now = new Date().toISOString();
  const results = await Promise.all(
    ids.map(async (id) => {
      try {
        const res = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`, {
          cache: "no-store",
          signal: AbortSignal.timeout(8000),
        });
        return { id, status: oembedStatus(res.status) };
      } catch {
        return { id, status: "unknown" as const };
      }
    }),
  );
  const known = results.filter((r) => r.status !== "unknown");
  if (known.length) {
    await supabase
      .from("sources")
      .upsert(known.map((r) => ({ youtube_id: r.id, status: r.status as "ok" | "broken", last_checked_at: now })), { onConflict: "youtube_id" });
  }
  return NextResponse.json({ checked: ids.length, broken: known.filter((r) => r.status === "broken").length, unknown: results.length - known.length });
}
