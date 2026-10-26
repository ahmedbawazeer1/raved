"use client";

import { useState } from "react";
import { PlayCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { VideoBlock as VideoBlockData } from "@/lib/content/types";

function formatDuration(sec?: number): string | null {
  if (!sec) return null;
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

/** Optional YouTube video: nothing is downloaded until the student taps (data saver). */
export function VideoBlock({ block }: { block: VideoBlockData }) {
  const [open, setOpen] = useState(false);
  if (!block.youtube_id) return null;
  const duration = formatDuration(block.duration_sec ?? (block.end_sec && block.start_sec !== undefined ? block.end_sec - block.start_sec : undefined));
  const meta = [duration, block.approx_size_mb ? `حوالي ${block.approx_size_mb}MB` : null].filter(Boolean).join(" · ");

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-border bg-card p-3.5 text-start"
      >
        <span className="flex size-10 flex-none items-center justify-center rounded-xl bg-muted text-subtle">
          <PlayCircle className="size-5" aria-hidden="true" />
        </span>
        <span className="flex-1 text-sm">
          فيديو إضافي من يوتيوب{meta && ` (${meta})`}
          {block.channel && <span className="block text-xs text-muted-foreground">{block.channel}</span>}
        </span>
        <Badge tone="muted">اختياري</Badge>
      </button>
    );
  }

  const params = new URLSearchParams({ autoplay: "1", rel: "0", cc_load_policy: "1", cc_lang_pref: "en" });
  if (block.start_sec) params.set("start", String(block.start_sec));
  if (block.end_sec) params.set("end", String(block.end_sec));
  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative aspect-video overflow-hidden rounded-2xl bg-black">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${block.youtube_id}?${params}`}
          title={block.video_title ?? "فيديو"}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 size-full"
        />
      </div>
      {block.channel && (
        <p className="text-xs text-muted-foreground">
          المصدر:{" "}
          {block.channel_url ? (
            <a href={block.channel_url} target="_blank" rel="noopener noreferrer">
              {block.channel}
            </a>
          ) : (
            block.channel
          )}
        </p>
      )}
    </div>
  );
}
