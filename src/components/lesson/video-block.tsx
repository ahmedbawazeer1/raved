"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Maximize, Pause, Play, RotateCcw, Volume2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Rafed } from "@/components/art/rafed";
import { En } from "@/components/en";
import { recordVideoPart, recordVideoWatch } from "@/app/(student)/student/actions";
import { isVideoPart, videoKey } from "@shared/lesson/video-part";
import { VIDEO_DONE } from "@/lib/gamification/events";
import { addSecond, parseRanges, videoDone, watchedPercent, watchedSeconds, type WatchRanges } from "@/lib/gamification/watch";
import { canSeek, checkpointsFor, dueCheckpoint, formatTime, frontierOf, rangesGradient, rewindTarget, type Checkpoint } from "@/lib/lesson/player";
import { fx } from "@/lib/fx";
import { speak } from "@/lib/tts";
import type { GameWord } from "@/lib/games/logic";
import type { VideoBlock as VideoBlockData } from "@/lib/content/types";
import { cn } from "@/lib/utils";

export interface VideoStatus {
  watched: number;
  duration: number;
  done: boolean;
}

// Minimal typing of the YouTube IFrame API we use.
interface YtPlayer {
  getCurrentTime(): number;
  getPlayerState(): number;
  pauseVideo(): void;
  playVideo(): void;
  seekTo(sec: number, allowSeekAhead: boolean): void;
  setPlaybackRate(rate: number): void;
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
const checkpointKey = (id: string) => `raved:checkpoints:${id}`;
const SPEEDS = [1, 1.25, 1.5];

function readAnswered(id: string): number[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(checkpointKey(id)) ?? "[]");
    return Array.isArray(v) ? v.filter((n): n is number => typeof n === "number") : [];
  } catch {
    return [];
  }
}

/**
 * The lesson video, first thing in the lesson. Nothing downloads until the student taps. When
 * `required`: our own controls (YouTube's are hidden) so the student can go back but never skip
 * ahead, the seconds really played are counted and saved (80% needed), and surprise questions pause
 * the video to ask about the part just watched. A wrong answer offers to watch that part again.
 */
export function VideoBlock({
  block,
  required = false,
  status,
  words = [],
}: {
  block: VideoBlockData;
  required?: boolean;
  status?: VideoStatus;
  /** The unit's words: a preview before the video, and fallback questions. */
  words?: GameWord[];
}) {
  const [open, setOpen] = useState(false);
  const duration = block.duration_sec ?? (block.end_sec && block.start_sec !== undefined ? block.end_sec - block.start_sec : 0);
  const tracking = required && !block.needs_check && Boolean(block.youtube_id);
  const id = block.youtube_id ?? "";
  // Keyed by content so a page refresh (new prop objects) does not restart the player.
  const wordsKey = JSON.stringify(words.map((w) => [w.id, w.word, w.meaning]));
  const contentKey = JSON.stringify(block.checkpoints ?? null);
  const checkpoints = useMemo(
    () => (tracking ? checkpointsFor(id, duration, JSON.parse(contentKey) ?? undefined, words) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- words and checkpoints are identified by their keys
    [tracking, id, duration, contentKey, wordsKey],
  );

  const [watched, setWatched] = useState(status?.watched ?? 0);
  const [done, setDone] = useState(status?.done ?? false);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [ranges, setRanges] = useState<WatchRanges>([]);
  const [speed, setSpeed] = useState(1);
  const [toast, setToast] = useState<string | null>(null);
  const [checkpoint, setCheckpoint] = useState<Checkpoint | null>(null);
  const [wrong, setWrong] = useState<number | null>(null);
  const [answered, setAnswered] = useState<Set<number>>(new Set());

  const stage = useRef<HTMLDivElement>(null);
  const holder = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YtPlayer | null>(null);
  const answeredRef = useRef<Set<number>>(new Set());
  const frontierRef = useRef(0);
  const offset = block.start_sec ?? 0;
  // A part of a video (one episode split across lessons) is tracked on its own.
  const part = isVideoPart(block);
  const key = videoKey(block);

  useEffect(() => {
    if (!open || !id || !holder.current) return;
    let player: YtPlayer | null = null;
    let timer: ReturnType<typeof setInterval> | undefined;
    let saved: WatchRanges = parseRanges(typeof localStorage === "undefined" ? null : localStorage.getItem(storageKey(key)));
    let lastSent = watchedSeconds(saved);
    let last = 0;
    let cancelled = false;
    frontierRef.current = frontierOf(saved);
    for (const at of readAnswered(key)) answeredRef.current.add(at);
    setAnswered(new Set(answeredRef.current));
    setRanges(saved);

    const send = async () => {
      const seconds = watchedSeconds(saved);
      if (!tracking || seconds <= lastSent) return;
      lastSent = seconds;
      const res = part ? await recordVideoPart(id, block.start_sec ?? 0, seconds) : await recordVideoWatch(id, seconds);
      if (res?.done && !cancelled) {
        setDone(true);
        fx("coin");
        window.dispatchEvent(new CustomEvent(VIDEO_DONE, { detail: { id } }));
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
          // Our own controls: YouTube's would allow skipping ahead.
          ...(tracking ? { controls: 0, disablekb: 1, fs: 0 } : {}),
          ...(block.start_sec ? { start: block.start_sec } : {}),
          ...(block.end_sec ? { end: block.end_sec } : {}),
        },
        events: {
          onStateChange: (e: { data: number }) => {
            setPlaying(e.data === YT.PlayerState.PLAYING);
            if (e.data === YT.PlayerState.PAUSED || e.data === YT.PlayerState.ENDED) void send();
          },
        },
      });
      playerRef.current = player;
      timer = setInterval(() => {
        if (!player || player.getPlayerState() !== YT.PlayerState.PLAYING) return;
        const now = player.getCurrentTime() - offset;
        // A question pauses the video at its moment until it is answered.
        const due = dueCheckpoint(checkpoints, last, now, answeredRef.current);
        last = now;
        if (due) {
          player.pauseVideo();
          setCheckpoint(due);
          setWrong(null);
          fx("pop");
          return;
        }
        if (now <= frontierRef.current + 3) frontierRef.current = Math.max(frontierRef.current, now);
        saved = addSecond(saved, now);
        const seconds = watchedSeconds(saved);
        setTime(now);
        setRanges(saved);
        setWatched((w) => Math.max(w, seconds));
        try {
          localStorage.setItem(storageKey(key), JSON.stringify(saved));
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
      playerRef.current = null;
    };
  }, [open, id, key, part, block.start_sec, block.end_sec, tracking, duration, checkpoints, offset]);

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2400);
  };

  const seek = (to: number) => {
    const p = playerRef.current;
    if (!p) return;
    const target = Math.max(0, Math.min(duration || to, to));
    if (tracking && !canSeek(target, frontierRef.current)) {
      flash("لا يمكن التقديم لجزء لم تشاهده بعد");
      fx("bad");
      return;
    }
    p.seekTo(target + offset, true);
    setTime(target);
  };

  const answer = (cp: Checkpoint, i: number) => {
    if (i !== cp.answer) {
      setWrong(i);
      fx("bad");
      return;
    }
    answeredRef.current.add(cp.at);
    setAnswered(new Set(answeredRef.current));
    try {
      localStorage.setItem(checkpointKey(key), JSON.stringify([...answeredRef.current]));
    } catch {
      // storage unavailable: the question may come again on reload
    }
    fx("ok");
    setWrong(null);
    setCheckpoint(null);
    playerRef.current?.playVideo();
  };

  const rewatch = (cp: Checkpoint) => {
    setCheckpoint(null);
    setWrong(null);
    seek(rewindTarget(checkpoints, cp.at));
    playerRef.current?.playVideo();
  };

  const fullscreen = () => {
    const el = stage.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    else void el.requestFullscreen?.().catch(() => {});
  };

  if (!block.youtube_id) return null;
  const percent = watchedPercent(watched, duration);
  const meta = [duration ? formatTime(duration) : null, block.approx_size_mb ? `حوالي ${block.approx_size_mb}MB` : null].filter(Boolean).join(" · ");
  const preview = words.slice(0, 3);
  const coach = done
    ? "أحسنت! أكملت مشاهدة الفيديو. بقية الدرس مفتوحة الآن 👇"
    : open
      ? checkpoints.length
        ? `ركّز! سأوقف الفيديو ${checkpoints.length === 1 ? "مرة" : `${checkpoints.length} مرات`} وأسألك عن ما شاهدته.`
        : "شاهد للنهاية، والتقديم لا يُحسب."
      : "الدرس يبدأ بالفيديو. شاهده أولاً لتفتح بقية الدرس.";

  // Optional extra video: a simple card, YouTube's own player.
  if (!tracking) {
    return (
      <div className="flex flex-col gap-2">
        {!open ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-border bg-card p-3.5 text-start"
          >
            <span className="flex size-10 flex-none items-center justify-center rounded-xl bg-muted text-subtle">
              <Play className="size-5" aria-hidden="true" />
            </span>
            <span className="flex-1 text-sm">
              <span className="block font-semibold">فيديو إضافي من يوتيوب</span>
              {meta && <span className="block text-xs text-muted-foreground">{meta}</span>}
            </span>
            <Badge tone="muted">اختياري</Badge>
          </button>
        ) : (
          <div className="relative aspect-video overflow-hidden rounded-2xl bg-black">
            <div ref={holder} className="absolute inset-0 [&_iframe]:size-full" title={block.video_title ?? "فيديو"} />
          </div>
        )}
      </div>
    );
  }

  return (
    <section aria-label="فيديو الدرس" className="flex flex-col gap-3">
      <div className="flex items-end gap-2">
        <Rafed
          mood={done ? "happy" : open ? "think" : "idle"}
          move={done ? "hop" : open ? "listen" : undefined}
          moveKey={done ? "done" : open ? "open" : undefined}
          size={52}
        />
        <p className="relative mb-2 min-w-0 flex-1 rounded-2xl border-2 border-border bg-card px-3 py-2 text-sm leading-relaxed font-semibold">{coach}</p>
      </div>

      {!open ? (
        <div className="flex flex-col gap-3 rounded-3xl bg-[radial-gradient(120%_90%_at_85%_0%,#18A383_0%,#0E6E5C_45%,#08392F_100%)] p-4 text-white">
          <div className="flex items-center gap-2">
            <Badge className="bg-accent text-accent-foreground">{done ? "شاهدته ✓" : "إلزامي"}</Badge>
            {meta && <span className="text-xs text-primary-tint">{meta}</span>}
          </div>
          <p className="text-lg font-bold">{block.video_title ? <En>{block.video_title}</En> : "فيديو الدرس"}</p>
          {preview.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <p className="text-xs text-primary-tint">كلمات ستسمعها في الفيديو:</p>
              <div className="flex flex-wrap gap-1.5">
                {preview.map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => speak(w.word)}
                    className="flex min-h-11 items-center gap-1.5 rounded-xl bg-white/15 px-3 text-sm hover:bg-white/25"
                  >
                    <Volume2 className="size-4" aria-hidden="true" />
                    <En className="font-bold">{w.word}</En>
                    <span className="text-primary-tint">{w.meaning}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              setOpen(true);
              fx("pop");
            }}
            className="flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-accent font-bold text-accent-foreground shadow-[0_5px_0_#C98210] active:translate-y-[5px] active:shadow-none"
          >
            <Play className="size-5 fill-current" aria-hidden="true" />
            {done ? "شاهد مرة أخرى" : percent > 0 ? `أكمل المشاهدة (${percent}%)` : "شاهد الفيديو"}
          </button>
          <p className="text-[11px] text-primary-tint">لا يُحمَّل الفيديو إلا بعد الضغط · المصدر: {block.channel ?? "يوتيوب"}</p>
        </div>
      ) : (
        <div ref={stage} className="flex flex-col gap-2 overflow-hidden rounded-3xl bg-black p-1.5 [&:fullscreen]:justify-center">
          <div className="relative aspect-video overflow-hidden rounded-2xl bg-black">
            <div ref={holder} className="absolute inset-0 [&_iframe]:size-full" title={block.video_title ?? "فيديو الدرس"} />
            {toast && (
              <p role="status" className="absolute inset-x-0 top-2 mx-auto w-max max-w-[90%] rounded-full bg-foreground/90 px-3 py-1 text-xs text-white">
                {toast}
              </p>
            )}
            {checkpoint && (
              <div role="dialog" aria-label="سؤال مفاجئ" className="absolute inset-0 flex items-center justify-center bg-black/55 p-2 backdrop-blur-[2px]">
                <div className="flex max-h-full w-full max-w-md flex-col gap-2 overflow-y-auto rounded-2xl bg-card p-3 text-foreground motion-safe:animate-[pop-in_.4s_cubic-bezier(.3,1.5,.5,1)]">
                  <span className="w-max rounded-full bg-accent px-2.5 text-[11px] font-extrabold text-accent-foreground">⏸ سؤال مفاجئ</span>
                  <p className="text-[15px] leading-snug font-bold">{checkpoint.prompt}</p>
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {checkpoint.options.map((o, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => answer(checkpoint, i)}
                        className={cn(
                          "min-h-11 rounded-xl border-2 bg-card px-3 text-start text-sm font-bold shadow-[0_3px_0_var(--color-border)]",
                          wrong === i ? "border-destructive bg-destructive-tint motion-safe:animate-[shake_.35s]" : "border-border",
                        )}
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                  {wrong !== null && (
                    <div className="flex flex-wrap items-center gap-2 text-xs text-destructive">
                      <span className="flex-1">ليست الإجابة. {checkpoint.source === "content" ? "الجواب في الجزء الذي شاهدته." : "جرّب مرة أخرى."}</span>
                      {checkpoint.source === "content" && (
                        <button
                          type="button"
                          onClick={() => rewatch(checkpoint)}
                          className="flex min-h-9 items-center gap-1 rounded-lg bg-destructive-tint px-2.5 font-bold"
                        >
                          <RotateCcw className="size-3.5" aria-hidden="true" />
                          أعد مشاهدة الجزء
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 px-1 pb-1 text-white" dir="ltr">
            <button
              type="button"
              aria-label={playing ? "إيقاف مؤقت" : "تشغيل"}
              disabled={Boolean(checkpoint)}
              onClick={() => (playing ? playerRef.current?.pauseVideo() : playerRef.current?.playVideo())}
              className="flex size-11 flex-none items-center justify-center rounded-xl bg-white/12 disabled:opacity-40"
            >
              {playing ? <Pause className="size-5" aria-hidden="true" /> : <Play className="size-5" aria-hidden="true" />}
            </button>
            <div
              role="slider"
              tabIndex={0}
              aria-label="موضع الفيديو"
              aria-valuemin={0}
              aria-valuemax={Math.round(duration)}
              aria-valuenow={Math.round(time)}
              aria-valuetext={`${formatTime(time)} من ${formatTime(duration)}`}
              className="flex h-11 min-w-0 flex-1 cursor-pointer items-center"
              onClick={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                seek(((e.clientX - r.left) / r.width) * duration);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowLeft") seek(time - 5);
                if (e.key === "ArrowRight") seek(time + 5);
              }}
            >
              <div className="relative h-2 w-full rounded-full bg-white/20">
                <div className="absolute inset-0 rounded-full" style={{ background: rangesGradient(ranges, duration, "#12B886") }} />
                {checkpoints.map((c) => (
                  <span
                    key={c.at}
                    aria-hidden="true"
                    className={cn(
                      "absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[2px]",
                      answered.has(c.at) ? "bg-accent" : "bg-white/50",
                    )}
                    style={{ left: `${(c.at / Math.max(1, duration)) * 100}%` }}
                  />
                ))}
                <span
                  aria-hidden="true"
                  className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-primary bg-white shadow"
                  style={{ left: `${Math.min(100, (time / Math.max(1, duration)) * 100)}%` }}
                />
              </div>
            </div>
            <span className="flex-none font-en text-xs tabular-nums text-white/80">
              {formatTime(time)} / {formatTime(duration)}
            </span>
            <button
              type="button"
              aria-label="سرعة التشغيل"
              onClick={() => {
                const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
                setSpeed(next);
                playerRef.current?.setPlaybackRate(next);
              }}
              className="flex h-11 min-w-11 flex-none items-center justify-center rounded-xl bg-white/12 px-1.5 font-en text-xs font-bold"
            >
              {speed}×
            </button>
            <button
              type="button"
              aria-label="ملء الشاشة"
              onClick={fullscreen}
              className="flex size-11 flex-none items-center justify-center rounded-xl bg-white/12"
            >
              <Maximize className="size-4.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3" aria-live="polite">
        <svg viewBox="0 0 52 52" className="size-13 flex-none" aria-hidden="true">
          <circle cx="26" cy="26" r="22" fill="none" stroke="var(--color-border)" strokeWidth="6" />
          <circle
            cx="26"
            cy="26"
            r="22"
            fill="none"
            stroke={done ? "#087443" : "#12B886"}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray="138.2"
            strokeDashoffset={138.2 * (1 - percent / 100)}
            transform="rotate(-90 26 26)"
            className="transition-[stroke-dashoffset] duration-300"
          />
          <text x="26" y="30" textAnchor="middle" fontSize="12" fontWeight="800" fill="currentColor" className="font-en">
            {percent}%
          </text>
        </svg>
        <div className="min-w-0 flex-1 text-[13px] leading-snug text-muted-foreground">
          <p className="flex items-center gap-1 text-[15px] font-bold text-foreground">
            {done && <CheckCircle2 className="size-4 text-success" aria-hidden="true" />}
            {done ? "أكملت مشاهدة الفيديو" : "شاهد 80% على الأقل"}
          </p>
          <p>
            التقديم لما لم تشاهده لا يُحسب
            {checkpoints.length > 0 && ` · أجبت ${answered.size} من ${checkpoints.length} أسئلة مفاجئة`}
          </p>
        </div>
      </div>
    </section>
  );
}
