/**
 * Small feedback effects (sounds made with the Web Audio API, phone vibration) and the student's
 * device preferences (effects on/off, their avatar). Preferences live in localStorage, with an
 * in-memory fallback, and are read with useSyncExternalStore (see prefsStore).
 *
 * Sounds are Raved's own: plucked strings (Karplus-Strong, like an oud) and water drops. No files.
 */
import { DEFAULT_AVATAR, parseAvatar, type AvatarConfig } from "@shared/art/avatar";
import { HAPTICS, type HapticKind } from "@shared/motion";

export interface Prefs {
  effects: boolean;
  avatar: AvatarConfig;
}

const KEY = "raved:prefs";
const DEFAULTS: Prefs = { effects: true, avatar: DEFAULT_AVATAR };
let memory: Prefs | null = null;
let cachedRaw: string | null | undefined;
let cached: Prefs = DEFAULTS;
const listeners = new Set<() => void>();

function readRaw(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return memory ? JSON.stringify(memory) : null;
  }
}

export function parsePrefs(raw: string | null): Prefs {
  if (!raw) return DEFAULTS;
  try {
    const p = JSON.parse(raw) as Partial<Prefs> & { companion?: string };
    const effects = typeof p.effects === "boolean" ? p.effects : DEFAULTS.effects;
    // Older devices saved a companion choice (before the avatar): Reem becomes a hijab avatar.
    if (!p.avatar && p.companion === "reem")
      return { effects, avatar: { ...DEFAULT_AVATAR, face: "oval", skin: "#E9BC96", hair: "hijab", hairColor: "#7A52D6", top: "#F5A524" } };
    return { effects, avatar: p.avatar ? parseAvatar(p.avatar) : DEFAULTS.avatar };
  } catch {
    return DEFAULTS;
  }
}

export function getPrefs(): Prefs {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cached = parsePrefs(raw);
  }
  return cached;
}

export function setPrefs(patch: Partial<Prefs>): void {
  const next = { ...getPrefs(), ...patch };
  memory = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // storage unavailable: keep it for this visit
  }
  listeners.forEach((l) => l());
}

export const prefsStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    const onStorage = (e: StorageEvent) => e.key === KEY && listener();
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  },
  getSnapshot: getPrefs,
  getServerSnapshot: () => DEFAULTS,
};

/** True when the student wants calm motion (device setting or effects turned off). */
export function calmMotion(): boolean {
  if (typeof window === "undefined") return true;
  return !getPrefs().effects || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/* ---------------- sounds ---------------- */
export type FxKind =
  | "ok"
  | "bad"
  | "coin"
  | "hit"
  | "pop"
  | "tap"
  | "drop"
  | "ripple"
  | "combo"
  | "level"
  | "pour"
  | "grow"
  | "whoosh"
  | "open"
  | "snore"
  | "tick"
  | "slam"
  | "stamp";

let audio: AudioContext | null = null;
function ctx(): AudioContext | null {
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  audio ??= new Ctor();
  if (audio.state === "suspended") void audio.resume();
  return audio;
}
function osc(c: AudioContext, f: number, at: number, dur: number, type: OscillatorType, vol: number, to?: number) {
  const t = c.currentTime + at,
    o = c.createOscillator(),
    g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}
/** A plucked string (Karplus-Strong). */
function pluck(c: AudioContext, f: number, at = 0, dur = 1, vol = 0.3, bright = 2600) {
  const sr = c.sampleRate,
    n = Math.max(2, Math.round(sr / f)),
    len = Math.round(sr * dur);
  const buf = c.createBuffer(1, len, sr),
    d = buf.getChannelData(0),
    ring = new Float32Array(n);
  for (let i = 0; i < n; i++) ring[i] = Math.random() * 2 - 1;
  for (let i = 0, k = 0; i < len; i++, k = (k + 1) % n) {
    const v = ring[k];
    ring[k] = 0.4985 * (v + ring[(k + 1) % n]);
    d[i] = v;
  }
  const s = c.createBufferSource(),
    lp = c.createBiquadFilter(),
    g = c.createGain();
  s.buffer = buf;
  lp.type = "lowpass";
  lp.frequency.value = bright;
  g.gain.value = vol;
  s.connect(lp).connect(g).connect(c.destination);
  s.start(c.currentTime + at);
}
function noise(c: AudioContext, at: number, dur: number, vol: number, f1: number, f2: number) {
  const len = Math.round(c.sampleRate * dur),
    buf = c.createBuffer(1, len, c.sampleRate),
    d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const s = c.createBufferSource(),
    bp = c.createBiquadFilter(),
    g = c.createGain(),
    t = c.currentTime + at;
  s.buffer = buf;
  bp.type = "bandpass";
  bp.Q.value = 1.2;
  bp.frequency.setValueAtTime(f1, t);
  bp.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.2);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(bp).connect(g).connect(c.destination);
  s.start(t);
}
const D = 293.66; // D, with a Hijaz colour (D Eb F# G A)
const drop = (c: AudioContext, at = 0, f = 520) => osc(c, f, at, 0.17, "sine", 0.22, f * 2.6);
const SOUNDS: Record<FxKind, (c: AudioContext) => void> = {
  tap: (c) => osc(c, 900, 0, 0.04, "sine", 0.05, 1300),
  pop: (c) => osc(c, 500, 0, 0.09, "sine", 0.16, 1000),
  drop: (c) => drop(c),
  coin: (c) => {
    drop(c, 0, 700);
    drop(c, 0.06, 1000);
  },
  ripple: (c) => {
    drop(c, 0, 600);
    drop(c, 0.09, 760);
    drop(c, 0.18, 940);
  },
  ok: (c) => [1, 1.26, 1.5].forEach((r, i) => pluck(c, D * r, i * 0.07, 1.1, 0.32)),
  bad: (c) => {
    pluck(c, 196, 0, 0.8, 0.28, 1400);
    pluck(c, 207.65, 0.1, 0.9, 0.24, 1400);
  },
  combo: (c) => [1, 1.0595, 1.26, 1.335, 1.5].forEach((r, i) => pluck(c, D * 2 * r, i * 0.06, 0.9, 0.2)),
  level: (c) => {
    [1, 1.26, 1.5, 2].forEach((r, i) => pluck(c, D * r, i * 0.11, 1.5, 0.32));
    drop(c, 0.5, 700);
  },
  pour: (c) => noise(c, 0, 1.3, 0.09, 2200, 700),
  grow: (c) => {
    osc(c, 220, 0, 0.7, "sine", 0.12, 660);
    pluck(c, D * 2, 0.5, 1.2, 0.2);
  },
  whoosh: (c) => noise(c, 0, 0.35, 0.12, 400, 2600),
  hit: (c) => {
    osc(c, 130, 0, 0.2, "square", 0.08, 60);
    noise(c, 0, 0.18, 0.12, 900, 200);
  },
  open: (c) => {
    noise(c, 0, 0.3, 0.06, 300, 1200);
    [2, 2.52, 3, 4].forEach((r, i) => pluck(c, D * r, 0.2 + i * 0.07, 1, 0.18));
  },
  snore: (c) => osc(c, 110, 0, 0.7, "sine", 0.07, 150),
  tick: (c) => osc(c, 1400, 0, 0.025, "square", 0.03),
  slam: (c) => {
    osc(c, 70, 0, 0.35, "square", 0.1, 40);
    noise(c, 0, 0.25, 0.12, 600, 100);
  },
  stamp: (c) => {
    osc(c, 90, 0, 0.12, "square", 0.12, 50);
    noise(c, 0, 0.08, 0.1, 400, 200);
  },
};
const HAPTIC_OF: Partial<Record<FxKind, HapticKind>> = {
  ok: "ok",
  bad: "no",
  hit: "no",
  level: "big",
  slam: "big",
  tick: "tick",
  tap: "tap",
  pop: "tap",
  coin: "ok",
  drop: "tap",
};

/** Plays a sound (and the matching vibration), unless the student turned effects off. */
export function fx(kind: FxKind): void {
  if (typeof window === "undefined" || !getPrefs().effects) return;
  try {
    const c = ctx();
    if (c) SOUNDS[kind](c);
  } catch {
    // no audio on this device
  }
  const h = HAPTIC_OF[kind];
  if (h) haptic(h);
}

/** A vibration from the haptics ladder (web approximation). */
export function haptic(kind: HapticKind): void {
  if (typeof window === "undefined" || !getPrefs().effects) return;
  try {
    navigator.vibrate?.(HAPTICS[kind].web as number | number[]);
  } catch {
    // no vibration
  }
}
