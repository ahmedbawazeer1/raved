/**
 * Plays a video file (VOA Learning English, public domain) behind the same small interface as the
 * YouTube IFrame API, so the lesson player (counting only the seconds really played, no skipping ahead,
 * surprise questions) works for both without a second code path. Pure DOM, unit tested.
 */
export interface NativePlayerOptions {
  videoUrl: string;
  playerVars?: { autoplay?: number; start?: number; end?: number };
  events?: { onStateChange?: (e: { data: number }) => void };
}

/** Same numbers as YT.PlayerState. */
export const NATIVE_STATE = { ENDED: 0, PLAYING: 1, PAUSED: 2 } as const;

export class NativePlayer {
  private video: HTMLVideoElement;
  private end: number | undefined;
  private notify: (state: number) => void;

  constructor(el: HTMLElement, opts: NativePlayerOptions) {
    const video = document.createElement("video");
    video.playsInline = true;
    video.preload = "metadata";
    video.controls = false;
    video.disablePictureInPicture = true;
    video.setAttribute("controlsList", "nodownload noplaybackrate");
    video.style.cssText = "width:100%;height:100%;background:#000;object-fit:contain";
    this.video = video;
    this.end = opts.playerVars?.end || undefined;
    this.notify = (data) => opts.events?.onStateChange?.({ data });
    const start = opts.playerVars?.start ?? 0;
    video.addEventListener("loadedmetadata", () => {
      if (start > 0) video.currentTime = start;
    });
    video.addEventListener("play", () => this.notify(NATIVE_STATE.PLAYING));
    video.addEventListener("pause", () => {
      if (!video.ended) this.notify(NATIVE_STATE.PAUSED);
    });
    video.addEventListener("ended", () => this.notify(NATIVE_STATE.ENDED));
    video.addEventListener("timeupdate", () => {
      if (this.end !== undefined && video.currentTime >= this.end && !video.paused) {
        video.pause();
        this.notify(NATIVE_STATE.ENDED);
      }
    });
    video.src = opts.videoUrl;
    el.replaceWith(video);
    if (opts.playerVars?.autoplay) void video.play().catch(() => this.notify(NATIVE_STATE.PAUSED));
  }

  getCurrentTime() {
    return this.video.currentTime;
  }
  getDuration() {
    return Number.isFinite(this.video.duration) ? this.video.duration : 0;
  }
  getPlayerState() {
    if (this.video.ended) return NATIVE_STATE.ENDED;
    return this.video.paused ? NATIVE_STATE.PAUSED : NATIVE_STATE.PLAYING;
  }
  pauseVideo() {
    this.video.pause();
  }
  playVideo() {
    void this.video.play().catch(() => this.notify(NATIVE_STATE.PAUSED));
  }
  seekTo(sec: number) {
    this.video.currentTime = sec;
  }
  setPlaybackRate(rate: number) {
    this.video.playbackRate = rate;
  }
  destroy() {
    this.video.pause();
    this.video.removeAttribute("src");
    this.video.load();
    this.video.remove();
  }
}

/** Shaped like the YT namespace the lesson player uses. */
export function nativePlayerApi() {
  return { Player: NativePlayer, PlayerState: { PLAYING: 1, PAUSED: 2, ENDED: 0 } };
}
