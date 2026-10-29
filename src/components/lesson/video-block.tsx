"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, PlayCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { recordVideoWatch } from "@/app/(student)/student/actions";
import { VIDEO_DONE } from "@/lib/gamification/events";
import { addSecond, parseRanges, videoDone, watchedPercent, watchedSeconds, type WatchRanges } from "@/lib/gamification/watch";
import type { VideoBlock as VideoBlockData } from "@/lib/content/types";

export interface VideoStatus {
  watched: number;
  duration: number;
  done: boolean;
}

function formatDuration(sec?: number): string | null {
  if (!sec) return null;
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

// Minimal typing of the YouTube IFrame API we use.
interface YtPlayer {
  getCurrentTime(): number;
  getPlayerState(): number;
  destroy(): void;
}
interface YtNamespace {
  Player: new (el: HTMLElement, opts: Record<string, unknown>) => YtPlayer;
  PlayerState: { PLAYING: number; PAUSED: number; ENDED: number };
}
declare global {
  interface Window {
    YT?: YtNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YtNamespace> | null = null;
/** Loads the official YouTube player script once, only after the student taps (data saver). */
function loadYouTubeApi(): Promise<YtNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  apiPromise ??= new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT!);
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    document.head.appendChild(script);
  });
  return apiPromise;
}

const storageKey = (id: string) => `raved:watch:${id}`;

/**
 * Lesson video. Nothing downloads until the student taps. When `required`, the seconds really played
 * are counted (skipping ahead does not count) and saved, and the lesson needs 80% of the video.
 */
export function VideoBlock({ block, required = false, status }: { block: VideoBlockData; required?: boolean; status?: VideoStatus }) {
  const [open, setOpen] = useState(false);
  const duration = block.duration_sec ?? (block.end_sec && block.start_sec !== undefined ? block.end_sec - block.start_sec : 0);
  const [watched, setWatched] = useState(status?.watched ?? 0);
  const [done, setDone] = useState(status?.done ?? false);
  const holder = useRef<HTMLDivElement>(null);
  const tracking = required && !block.needs_check && Boolean(block.youtube_id);

  useEffect(() => {
    if (!open || !block.youtube_id || !holder.current) return;
    const id = block.youtube_id;
    let player: YtPlayer | null = null;
    let timer: ReturnType<typeof setInterval> | undefined;
    let ranges: WatchRanges = parseRanges(typeof localStorage === "undefined" ? null : localStorage.getItem(storageKey(id)));
    let lastSent = watchedSeconds(ranges);
    let cancelled = false;

    const send = async () => {
      const seconds = watchedSeconds(ranges);
      if (!tracking || seconds <= lastSent) return;
      lastSent = seconds;
      const res = await recordVideoWatch(id, seconds);
      if (res && !cancelled) {
        if (res.done) {
          setDone(true);
          window.dispatchEvent(new CustomEvent(VIDEO_DONE, { detail: { id } }));
        }
      }
    };

    loadYouTubeApi().then((YT) => {
      if (cancelled || !holder.current) return;
      const target = document.createElement("div");
      holder.current.appendChild(target);
      player = new YT.Player(target, {
        videoId: id,
        host: "https://www.youtube-nocookie.com",
        width: "100%",
        height: "100%",
        playerVars: {
          autoplay: 1,
          rel: 0,
          playsinline: 1,
          cc_load_policy: 1,
          cc_lang_pref: "en",
          ...(block.start_sec ? { start: block.start_sec } : {}),
          ...(block.end_sec ? { end: block.end_sec } : {}),
        },
        events: {
          onStateChange: (e: { data: number }) => {
            if (e.data === YT.PlayerState.PAUSED || e.data === YT.PlayerState.ENDED) void send();
          },
        },
      });
      timer = setInterval(() => {
        if (!player || player.getPlayerState() !== YT.PlayerState.PLAYING) return;
        ranges = addSecond(ranges, player.getCurrentTime());
        const seconds = watchedSeconds(ranges);
        setWatched((w) => Math.max(w, seconds));
        try {
          localStorage.setItem(storageKey(id), JSON.stringify(ranges));
        } catch {
          // storage unavailable: progress still goes to the server
        }
        if (seconds - lastSent >= 10 || (tracking && videoDone(seconds, duration))) void send();
      }, 500);
    });

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      void send();
      player?.destroy();
    };
  }, [open, block.youtube_id, block.start_sec, block.end_sec, tracking, duration]);

  if (!block.youtube_id) return null;
  const meta = [formatDuration(duration || undefined), block.approx_size_mb ? `حوالي ${block.approx_size_mb}MB` : null].filter(Boolean).join(" · ");
  const percent = watchedPercent(watched, duration);

  return (
    <div className="flex flex-col gap-2">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-border bg-card p-3.5 text-start"
        >
          <span className={`flex size-10 flex-none items-center justify-center rounded-xl ${tracking && !done ? "bg-primary text-white" : "bg-muted text-subtle"}`}>
            {done ? <CheckCircle2 className="size-5 text-success" aria-hidden="true" /> : <PlayCircle className="size-5" aria-hidden="true" />}
          </span>
          <span className="flex-1 text-sm">
            <span className="block font-semibold">{tracking ? "فيديو الدرس" : "فيديو إضافي من يوتيوب"}</span>
            {meta && <span className="block text-xs text-muted-foreground">{meta}</span>}
            {block.channel && <span className="block text-xs text-muted-foreground">{block.channel}</span>}
          </span>
          {tracking ? done ? <Badge tone="success">شاهدته ✓</Badge> : <Badge>إلزامي</Badge> : <Badge tone="muted">اختياري</Badge>}
        </button>
      ) : (
        <div className="relative aspect-video overflow-hidden rounded-2xl bg-black">
          <div ref={holder} className="absolute inset-0 [&_iframe]:size-full" title={block.video_title ?? "فيديو"} />
        </div>
      )}
      {tracking && (
        <div className="flex flex-col gap-1" aria-live="polite">
          <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="ما شاهدته من الفيديو">
            <div className={`h-full rounded-full ${done ? "bg-success" : "bg-primary"}`} style={{ width: `${percent}%` }} />
          </div>
          <p className="text-xs text-muted-foreground">
            {done ? "أكملت مشاهدة الفيديو ✓" : `شاهدت ${percent}% · المطلوب 80% على الأقل، والتقديم السريع لا يُحسب`}
          </p>
        </div>
      )}
      {open && block.channel && (
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
