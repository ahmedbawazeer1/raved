/**
 * Small feedback effects (sounds made with the Web Audio API, phone vibration) and the student's
 * device preferences (effects on/off, chosen companion). Preferences live in localStorage, with an
 * in-memory fallback, and are read with useSyncExternalStore (see usePrefs).
 */
import type { CompanionId, Headwear } from "@/lib/art/companion";

export interface Prefs {
  effects: boolean;
  companion: CompanionId;
  /** Hamza's headwear and Reem's hijab colour (see src/lib/art/wardrobe.ts). */
  headwear: Headwear;
  hijab: string;
}

const KEY = "raved:prefs";
const DEFAULTS: Prefs = { effects: true, companion: "hamza", headwear: "kufi", hijab: "plum" };
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
    const p = JSON.parse(raw) as Partial<Prefs>;
    return {
      effects: typeof p.effects === "boolean" ? p.effects : DEFAULTS.effects,
      companion: p.companion === "reem" ? "reem" : "hamza",
      headwear: p.headwear === "emama" || p.headwear === "none" ? p.headwear : DEFAULTS.headwear,
      hijab: typeof p.hijab === "string" ? p.hijab : DEFAULTS.hijab,
    };
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

export type FxKind = "ok" | "bad" | "coin" | "hit" | "pop";

const NOTES: Record<FxKind, [number, number][]> = {
  ok: [
    [660, 0],
    [990, 0.09],
  ],
  bad: [
    [200, 0],
    [160, 0.1],
  ],
  coin: [
    [1200, 0],
    [1600, 0.06],
    [2000, 0.12],
  ],
  hit: [
    [120, 0],
    [80, 0.05],
  ],
  pop: [[520, 0]],
};

let audio: AudioContext | null = null;

/** Plays a short sound and a vibration, unless the student turned effects off. */
export function fx(kind: FxKind): void {
  if (typeof window === "undefined" || !getPrefs().effects) return;
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (Ctor) {
      audio ??= new Ctor();
      for (const [freq, delay] of NOTES[kind]) {
        const osc = audio.createOscillator();
        const gain = audio.createGain();
        const t = audio.currentTime + delay;
        osc.type = kind === "bad" || kind === "hit" ? "sawtooth" : "triangle";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(kind === "bad" ? 0.07 : 0.16, t + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
        osc.connect(gain).connect(audio.destination);
        osc.start(t);
        osc.stop(t + 0.22);
      }
    }
  } catch {
    // no audio on this device
  }
  try {
    navigator.vibrate?.(kind === "bad" || kind === "hit" ? [40, 40, 40] : 25);
  } catch {
    // no vibration
  }
}
