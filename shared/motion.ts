/**
 * Motion tokens shared by the web (GSAP) and mobile (Reanimated). Every animation uses one of these
 * speeds, and every important moment uses one step of the haptics ladder. See the Raved art library.
 */
export const MOTION = {
  /** Buttons, tiles, ripple. */
  tap: { ms: 100, ease: "power2.out" },
  /** Screens, sheets, notifications. */
  move: { ms: 300, ease: "power3.out" },
  /** Water bar, flying tiles, badges. */
  spring: { ms: 450, ease: "back.out(1.7)" },
  /** Characters landing, trailing leaves. */
  elastic: { ms: 800, ease: "elastic.out(1,.4)" },
} as const;

/** The six screen transitions (see the flows library). */
export const TRANSITIONS = {
  push: 380,
  back: 380,
  sheet: 420,
  dive: 650,
  wave: 800,
  celebrate: 350,
} as const;
export type TransitionKind = keyof typeof TRANSITIONS;

/** Haptics ladder (mobile). The web uses navigator.vibrate patterns of the same feel. */
export const HAPTICS = {
  tap: { mobile: "selection", web: 10 },
  ok: { mobile: "success", web: 25 },
  no: { mobile: "warning", web: [30, 40, 30] },
  big: { mobile: "heavy2", web: [40, 60, 40] },
  tick: { mobile: "light", web: 8 },
} as const;
export type HapticKind = keyof typeof HAPTICS;

/** Any blocking animation stays under this many milliseconds (celebrations are skippable). */
export const MAX_BLOCKING_MS = 1000;
