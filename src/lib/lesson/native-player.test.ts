// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { NATIVE_STATE, NativePlayer } from "./native-player";

function setup(vars: { autoplay?: number; start?: number; end?: number } = {}) {
  const play = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  const pause = vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => {});
  document.body.innerHTML = '<div id="t"></div>';
  const states: number[] = [];
  const p = new NativePlayer(document.getElementById("t")!, {
    videoUrl: "https://voa-video.voanews.eu/a_480p.mp4",
    playerVars: vars,
    events: { onStateChange: (e) => states.push(e.data) },
  });
  const video = document.querySelector("video")!;
  return { p, video, states, play, pause };
}

describe("NativePlayer", () => {
  it("replaces the placeholder with a video without controls", () => {
    const { video } = setup();
    expect(video.controls).toBe(false);
    expect(video.src).toBe("https://voa-video.voanews.eu/a_480p.mp4");
    expect(document.getElementById("t")).toBeNull();
  });

  it("starts at the part's start second once the file is known", () => {
    const { video } = setup({ start: 12 });
    video.dispatchEvent(new Event("loadedmetadata"));
    expect(video.currentTime).toBe(12);
  });

  it("reports playing, paused and ended like the YouTube player", () => {
    const { video, states } = setup();
    video.dispatchEvent(new Event("play"));
    video.dispatchEvent(new Event("pause"));
    video.dispatchEvent(new Event("ended"));
    expect(states).toEqual([NATIVE_STATE.PLAYING, NATIVE_STATE.PAUSED, NATIVE_STATE.ENDED]);
  });

  it("stops at the end second of a part", () => {
    const { video, states, pause } = setup({ end: 30 });
    Object.defineProperty(video, "paused", { value: false, configurable: true });
    video.currentTime = 31;
    video.dispatchEvent(new Event("timeupdate"));
    expect(pause).toHaveBeenCalled();
    expect(states).toContain(NATIVE_STATE.ENDED);
  });

  it("seeks, changes speed and cleans up", () => {
    const { p, video } = setup();
    p.seekTo(20);
    p.setPlaybackRate(1.25);
    expect(video.currentTime).toBe(20);
    expect(video.playbackRate).toBe(1.25);
    p.destroy();
    expect(document.querySelector("video")).toBeNull();
  });
});
