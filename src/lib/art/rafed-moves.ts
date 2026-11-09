/**
 * Rafed's moves on the web (GSAP). Works on the markup from @shared/art/rafed.
 * Client-only: import from client components.
 */
import { gsap } from "gsap";
import { RAFED_MOUTHS, STAGE_EYES, STAGE_SCALE, type RafedMood, type RafedMouth, type RafedStage } from "@shared/art/rafed";
import { fx } from "@/lib/fx";

type El = Element;
export interface RafedParts {
  el: SVGSVGElement;
  all: El;
  stg: El;
  sprout: El;
  face: El;
  eyesW: El;
  armL: El;
  armR: El;
  footL: El;
  footR: El;
  shadow: El;
  lids: El[];
  lidR: El;
  lidsB: El[];
  pupils: El[];
  eyes: El[];
  browL: El;
  browR: El;
  mouth: El;
  cheeks: El[];
  dryB: El;
  dryM: El | null;
  dryId: string;
  tear: El;
  sweat: El;
  zzz: El;
  bulb: El;
  dots: El;
  hearts: El;
  notes: El;
  dropFx: El;
  spark: El;
  fx: El[];
  /** No sounds (moves played on page load, before the student taps anything). */
  quiet?: boolean;
}

export function rafedParts(el: SVGSVGElement, stage: RafedStage, filterId: string): RafedParts {
  const q = (s: string) => el.querySelector(s) as El,
    qa = (s: string) => [...el.querySelectorAll(s)];
  // Static poses come as transform attributes; GSAP owns transforms from here on.
  qa(".stg,.eyesW,.sprout,.armR,.lid,.lidB,.browL,.browR,.pupil").forEach((n) => n.removeAttribute("transform"));
  const p = {
    el,
    all: q(".all"),
    stg: q(".stg"),
    sprout: q(".sprout"),
    face: q(".face"),
    eyesW: q(".eyesW"),
    armL: q(".armL"),
    armR: q(".armR"),
    footL: q(".footL"),
    footR: q(".footR"),
    shadow: q(".shadow"),
    lids: qa(".lid"),
    lidR: q(".eyeR .lid"),
    lidsB: qa(".lidB"),
    pupils: qa(".pupil"),
    eyes: qa(".eyeL,.eyeR"),
    browL: q(".browL"),
    browR: q(".browR"),
    mouth: q(".mouthPath"),
    cheeks: qa(".cheek"),
    dryB: q(".dryB"),
    dryM: el.querySelector(".dryM"),
    dryId: filterId,
    tear: q(".tear"),
    sweat: q(".sweat"),
    zzz: q(".zzz"),
    bulb: q(".bulb"),
    dots: q(".dots"),
    hearts: q(".hearts"),
    notes: q(".notes"),
    dropFx: q(".dropFx"),
    spark: q(".spark"),
  } as RafedParts;
  p.fx = [p.tear, p.sweat, p.zzz, p.bulb, p.dots, p.hearts, p.notes, p.dropFx, p.spark];
  gsap.set(p.stg, { svgOrigin: "120 266", scale: STAGE_SCALE[stage - 1] });
  gsap.set(p.eyesW, { transformOrigin: "50% 50%", scale: STAGE_EYES[stage - 1] });
  gsap.set(p.all, { svgOrigin: "120 266" });
  gsap.set(p.armL, { svgOrigin: "54 176" });
  gsap.set(p.armR, { svgOrigin: "186 176" });
  gsap.set(p.sprout, { svgOrigin: "121 62" });
  gsap.set(p.footL, { svgOrigin: "92 251" });
  gsap.set(p.footR, { svgOrigin: "148 251" });
  gsap.set(p.shadow, { svgOrigin: "120 268" });
  gsap.set(p.face, { svgOrigin: "120 190" });
  gsap.set([...p.eyes, p.browL, p.browR, p.bulb, p.hearts, ...p.cheeks], { transformOrigin: "50% 50%" });
  gsap.set(p.lids, { transformOrigin: "50% 0%" });
  gsap.set(p.lidsB, { transformOrigin: "50% 100%" });
  rafedReset(p);
  return p;
}

export function rafedReset(p: RafedParts) {
  gsap.set([p.all, p.sprout, p.armL, p.armR, p.footL, p.footR, p.face, ...p.pupils, ...p.eyes, p.browL, p.browR, p.shadow, ...p.cheeks, ...p.fx], {
    x: 0,
    y: 0,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
  });
  gsap.set(p.fx, { opacity: 0 });
  gsap.set(p.shadow, { opacity: 0.2 });
  gsap.set(p.cheeks, { opacity: 0.55 });
  gsap.set(p.dryB, { opacity: 0 });
  if (p.dryM) gsap.set(p.dryM, { attr: { values: 1 } });
  p.all.removeAttribute("filter");
  gsap.set(p.lids, { scaleY: 0 });
  gsap.set(p.lidsB, { scaleY: 0 });
  gsap.set(p.mouth, { attr: { d: RAFED_MOUTHS.smile } });
}

/** A still pose for a mood (after reset). */
export function rafedPose(p: RafedParts, mood: RafedMood, wave = false) {
  const m = (k: RafedMouth) => gsap.set(p.mouth, { attr: { d: RAFED_MOUTHS[k] } });
  if (wave) gsap.set(p.armR, { rotation: -115 });
  switch (mood) {
    case "happy":
      m("big");
      gsap.set(p.lidsB, { scaleY: 0.4 });
      gsap.set([p.browL, p.browR], { y: -7 });
      break;
    case "sad":
      m("sad");
      gsap.set(p.browL, { rotation: -16 });
      gsap.set(p.browR, { rotation: 16 });
      gsap.set(p.sprout, { rotation: 30 });
      gsap.set(p.lids, { scaleY: 0.32 });
      gsap.set(p.pupils, { y: 5 });
      break;
    case "think":
      m("flat");
      gsap.set(p.pupils, { x: -5, y: -8 });
      gsap.set(p.dots, { opacity: 1 });
      break;
    case "wow":
      m("wow");
      gsap.set(p.eyes, { scale: 1.15 });
      gsap.set([p.browL, p.browR], { y: -12 });
      break;
    case "sleep":
      m("sleep");
      gsap.set(p.lids, { scaleY: 1 });
      gsap.set(p.zzz, { opacity: 1 });
      gsap.set(p.sprout, { rotation: 28 });
      break;
    case "wilt":
      if (p.dryM) {
        p.all.setAttribute("filter", `url(#${p.dryId})`);
        gsap.set(p.dryM, { attr: { values: 0.3 } });
      }
      gsap.set(p.dryB, { opacity: 0.75 });
      gsap.set(p.sprout, { rotation: 42, scaleY: 0.85 });
      gsap.set(p.lids, { scaleY: 0.5 });
      m("sad");
      break;
    case "wink":
      m("grin");
      gsap.set(p.lidR, { scaleY: 1 });
      gsap.set(p.hearts, { opacity: 1 });
      break;
    case "proud":
      m("grin");
      gsap.set(p.lidsB, { scaleY: 0.4 });
      gsap.set(p.spark, { opacity: 1 });
      break;
    default:
      break;
  }
}

export function rafedSetStage(p: RafedParts, s: RafedStage) {
  gsap.to(p.stg, { scale: STAGE_SCALE[s - 1], duration: 0.6, ease: "elastic.out(1,.45)" });
  gsap.to(p.eyesW, { scale: STAGE_EYES[s - 1], duration: 0.6, ease: "elastic.out(1,.45)" });
}

const mo = (p: RafedParts, k: RafedMouth, d = 0.14) => gsap.to(p.mouth, { attr: { d: RAFED_MOUTHS[k] }, duration: d, ease: "power2.out" });
const blink = (p: RafedParts) => gsap.timeline().to(p.lids, { scaleY: 1, duration: 0.07 }).to(p.lids, { scaleY: 0, duration: 0.1 });
export function rafedHop(p: RafedParts, h = 60) {
  return gsap
    .timeline()
    .to(p.all, { scaleY: 0.82, scaleX: 1.16, duration: 0.14, ease: "power2.in" })
    .to(p.sprout, { scaleY: 0.85, duration: 0.14 }, "<")
    .to(p.all, { y: -h, scaleY: 1.12, scaleX: 0.9, duration: 0.28, ease: "power2.out" })
    .to(p.sprout, { scaleY: 0.8, rotation: -6, duration: 0.2 }, "<")
    .to(p.shadow, { scale: 0.55, opacity: 0.08, duration: 0.28 }, "<")
    .to(p.sprout, { scaleY: 1.18, rotation: 4, duration: 0.24 }, ">-0.08")
    .to(p.all, { y: 0, scaleY: 1, scaleX: 1, duration: 0.24, ease: "power2.in" }, "<")
    .to(p.shadow, { scale: 1, opacity: 0.2, duration: 0.24 }, "<")
    .to(p.all, { scaleY: 0.86, scaleX: 1.12, duration: 0.08 })
    .to(p.all, { scaleY: 1, scaleX: 1, duration: 0.6, ease: "elastic.out(1,.4)" })
    .to(p.sprout, { scaleY: 1, rotation: 0, duration: 0.8, ease: "elastic.out(1,.3)" }, "<");
}
const back = (p: RafedParts, t: gsap.core.Timeline) =>
  t
    .to([p.all, p.armL, p.armR, p.sprout, p.face], { rotation: 0, x: 0, y: 0, duration: 0.4, ease: "back.out(1.5)" })
    .to([p.browL, p.browR], { y: 0, rotation: 0, duration: 0.3 }, "<")
    .to(p.pupils, { x: 0, y: 0, duration: 0.3 }, "<")
    .to([...p.lids, ...p.lidsB], { scaleY: 0, duration: 0.25 }, "<")
    .add(mo(p, "smile"), "<");
const snd = (p: RafedParts, t: gsap.core.Timeline, k: Parameters<typeof fx>[0], at = 0) => t.call(() => void (!p.quiet && fx(k)), undefined, at);

export type RafedMove =
  | "idle"
  | "wave"
  | "hop"
  | "cheer"
  | "dance"
  | "proud"
  | "surprised"
  | "think"
  | "idea"
  | "listen"
  | "talk"
  | "nod"
  | "oops"
  | "sad"
  | "wilt"
  | "drink"
  | "grow"
  | "sleep"
  | "spin"
  | "wink"
  | "point"
  | "shy"
  | "peek";

export const RAFED_MOVES: Record<RafedMove, (p: RafedParts) => gsap.core.Timeline> = {
  idle(p) {
    return gsap
      .timeline({ repeat: -1 })
      .to(p.all, { scaleY: 0.975, scaleX: 1.02, duration: 1.2, ease: "sine.inOut", yoyo: true, repeat: 1 })
      .to(p.sprout, { rotation: 6, duration: 1.2, ease: "sine.inOut", yoyo: true, repeat: 1 }, 0.15)
      .to(p.armL, { rotation: -5, duration: 1.2, ease: "sine.inOut", yoyo: true, repeat: 1 }, 0)
      .to(p.armR, { rotation: 5, duration: 1.2, ease: "sine.inOut", yoyo: true, repeat: 1 }, 0)
      .to(p.pupils, { x: 4, duration: 0.25 }, 0.5)
      .add(blink(p), 1.4)
      .to(p.pupils, { x: -3, y: -2, duration: 0.25 }, 1.8)
      .to(p.pupils, { x: 0, y: 0, duration: 0.3 }, 2.2);
  },
  wave(p) {
    const t = gsap.timeline();
    t.add(mo(p, "big"))
      .to([p.browL, p.browR], { y: -6, duration: 0.2 }, 0)
      .to(p.lidsB, { scaleY: 0.35, duration: 0.2 }, 0)
      .to(p.armR, { rotation: -125, duration: 0.35, ease: "back.out(2)" }, 0)
      .to(p.armR, { rotation: -95, duration: 0.17, yoyo: true, repeat: 5, ease: "sine.inOut" })
      .to(p.all, { rotation: -4, duration: 0.34, yoyo: true, repeat: 2, ease: "sine.inOut" }, 0.35)
      .to(p.sprout, { rotation: -12, duration: 0.34, yoyo: true, repeat: 2 }, 0.4);
    snd(p, t, "pop", 0.1);
    return back(p, t);
  },
  hop(p) {
    const t = gsap.timeline();
    t.add(mo(p, "big", 0.1))
      .to(p.lidsB, { scaleY: 0.35, duration: 0.1 }, 0)
      .to(p.armL, { rotation: 50, duration: 0.3 }, 0.14)
      .to(p.armR, { rotation: -50, duration: 0.3 }, 0.14)
      .add(rafedHop(p, 70), 0)
      .to([p.armL, p.armR], { rotation: 0, duration: 0.3 }, 0.66);
    return back(p, t);
  },
  cheer(p) {
    const t = gsap.timeline();
    t.add(mo(p, "big"))
      .to(p.lidsB, { scaleY: 0.45, duration: 0.15 }, 0)
      .to(p.armL, { rotation: 135, duration: 0.3, ease: "back.out(2)" }, 0)
      .to(p.armR, { rotation: -135, duration: 0.3, ease: "back.out(2)" }, 0)
      .add(rafedHop(p, 50), 0.15)
      .add(rafedHop(p, 40), 0.95)
      .to(p.armL, { rotation: 118, duration: 0.15, yoyo: true, repeat: 5 }, 0.2)
      .to(p.armR, { rotation: -118, duration: 0.15, yoyo: true, repeat: 5 }, 0.2);
    return back(p, t);
  },
  dance(p) {
    const t = gsap.timeline();
    t.add(mo(p, "grin"));
    for (let i = 0; i < 4; i++) {
      const s = i % 2 ? 1 : -1;
      t.to(p.all, { rotation: 9 * s, x: 10 * s, duration: 0.24, ease: "power2.out" })
        .to(p.armL, { rotation: s > 0 ? 120 : 20, duration: 0.24 }, "<")
        .to(p.armR, { rotation: s > 0 ? -20 : -120, duration: 0.24 }, "<")
        .to(s > 0 ? p.footR : p.footL, { y: -12, duration: 0.12, yoyo: true, repeat: 1 }, "<")
        .to(p.sprout, { rotation: -16 * s, duration: 0.3 }, "<+0.05")
        .add(mo(p, i % 2 ? "big" : "grin", 0.1), "<");
    }
    snd(p, t, "combo", 0);
    return back(p, t);
  },
  proud(p) {
    const t = gsap.timeline();
    t.to(p.all, { scaleX: 1.08, scaleY: 1.05, duration: 0.35, ease: "back.out(2)" })
      .add(mo(p, "grin"), 0)
      .to(p.lidsB, { scaleY: 0.4, duration: 0.2 }, 0)
      .to([p.browL, p.browR], { y: -5, duration: 0.2 }, 0)
      .to(p.armL, { rotation: -28, duration: 0.3 }, 0)
      .to(p.armR, { rotation: 28, duration: 0.3 }, 0)
      .to(p.sprout, { rotation: -8, scaleY: 1.12, duration: 0.4, ease: "back.out(2)" }, 0)
      .set(p.spark, { opacity: 1 }, 0.2)
      .from(p.spark.children, { scale: 0, transformOrigin: "50% 50%", stagger: 0.1, duration: 0.4, ease: "back.out(3)" }, 0.2)
      .to(p.spark, { opacity: 0, duration: 0.3 }, 1.6)
      .to(p.all, { scaleX: 1, scaleY: 1, duration: 0.4 }, 1.6);
    return back(p, t);
  },
  surprised(p) {
    const t = gsap.timeline();
    t.to(p.all, { scaleY: 1.14, scaleX: 0.9, y: -14, duration: 0.14, ease: "power2.out" })
      .to(p.eyes, { scale: 1.18, duration: 0.14 }, 0)
      .to([p.browL, p.browR], { y: -13, duration: 0.14 }, 0)
      .add(mo(p, "wow", 0.1), 0)
      .to(p.sprout, { scaleY: 1.3, duration: 0.14 }, 0)
      .to(p.armL, { rotation: 45, duration: 0.18 }, 0)
      .to(p.armR, { rotation: -45, duration: 0.18 }, 0)
      .to(p.all, { y: 0, scaleY: 1, scaleX: 1, duration: 0.7, ease: "elastic.out(1,.35)" })
      .to(p.sprout, { scaleY: 1, duration: 0.9, ease: "elastic.out(1,.25)" }, "<")
      .to({}, { duration: 0.5 })
      .to(p.eyes, { scale: 1, duration: 0.3 });
    return back(p, t);
  },
  think(p) {
    const t = gsap.timeline();
    t.to(p.pupils, { x: -5, y: -8, duration: 0.3 })
      .add(mo(p, "flat"), 0)
      .to(p.browR, { y: -9, duration: 0.3 }, 0)
      .to(p.armR, { rotation: 58, duration: 0.4, ease: "back.out(1.6)" }, 0)
      .to(p.all, { rotation: -5, duration: 0.4 }, 0)
      .set(p.dots, { opacity: 1 }, 0.4)
      .from(p.dots.children, { scale: 0, transformOrigin: "50% 50%", stagger: 0.25, duration: 0.35, ease: "back.out(3)" }, 0.4)
      .add(mo(p, "grin"), 1.4)
      .to(p.armR, { rotation: 66, duration: 0.15, yoyo: true, repeat: 3 }, 1.2)
      .to({}, { duration: 0.5 })
      .to(p.dots, { opacity: 0, duration: 0.2 });
    return back(p, t);
  },
  idea(p) {
    const t = gsap.timeline();
    t.to(p.pupils, { y: -8, duration: 0.25 })
      .add(mo(p, "flat"), 0)
      .set(p.bulb, { opacity: 1 }, 0.5)
      .fromTo(p.bulb, { scale: 0, rotation: -30 }, { scale: 1, rotation: 0, duration: 0.5, ease: "back.out(3)" }, 0.5)
      .add(mo(p, "wow", 0.1), 0.5)
      .to([p.browL, p.browR], { y: -10, duration: 0.15 }, 0.5)
      .add(rafedHop(p, 30), 0.6)
      .to(p.armR, { rotation: -135, duration: 0.3, ease: "back.out(2)" }, 0.6)
      .add(mo(p, "big"), 1)
      .to(p.bulb, { scale: 1.12, duration: 0.2, yoyo: true, repeat: 3 }, 1)
      .to({}, { duration: 0.4 })
      .to(p.bulb, { opacity: 0, scale: 0.5, duration: 0.25 });
    snd(p, t, "coin", 0.5);
    return back(p, t);
  },
  listen(p) {
    const t = gsap.timeline();
    t.to(p.all, { rotation: 8, duration: 0.35, ease: "back.out(2)" })
      .to(p.armL, { rotation: 128, duration: 0.35, ease: "back.out(2)" }, 0)
      .to(p.pupils, { x: -6, y: -4, duration: 0.25 }, 0)
      .add(mo(p, "flat"), 0)
      .set(p.notes, { opacity: 1 }, 0.3)
      .fromTo(p.notes, { y: 10, scale: 0.5, transformOrigin: "50% 50%" }, { y: -16, scale: 1, duration: 0.6, ease: "back.out(2)" }, 0.3)
      .add(mo(p, "grin"), 1.2)
      .to(p.notes, { opacity: 0, y: -40, duration: 0.4 }, 2);
    return back(p, t);
  },
  talk(p) {
    const t = gsap.timeline(),
      seq: RafedMouth[] = ["O", "big", "E", "smile", "O", "flat", "big", "E", "O", "smile", "big", "flat", "O", "smile"];
    t.to([p.browL, p.browR], { y: -4, duration: 0.2 }, 0);
    seq.forEach((k, i) => {
      t.add(mo(p, k, 0.07), i * 0.1);
      if (i % 4 === 0) t.to(p.face, { rotation: i % 8 ? 2 : -2, duration: 0.2, ease: "sine.inOut" }, i * 0.1);
    });
    t.to(p.armR, { rotation: -30, duration: 0.2, yoyo: true, repeat: 3 }, 0.3);
    return back(p, t);
  },
  nod(p) {
    const t = gsap.timeline();
    t.add(mo(p, "smile")).to(p.lidsB, { scaleY: 0.3, duration: 0.15 }, 0);
    for (let i = 0; i < 2; i++)
      t.to(p.face, { y: 7, duration: 0.14, ease: "power2.in" })
        .to(p.sprout, { rotation: 8, duration: 0.14 }, "<")
        .to(p.face, { y: 0, duration: 0.2, ease: "back.out(2)" })
        .to(p.sprout, { rotation: 0, duration: 0.3 }, "<");
    return back(p, t);
  },
  oops(p) {
    const t = gsap.timeline();
    t.add(mo(p, "E", 0.1))
      .to(p.browL, { rotation: -12, duration: 0.15 }, 0)
      .to(p.browR, { rotation: 12, duration: 0.15 }, 0)
      .to(p.lidsB, { scaleY: 0.25, duration: 0.15 }, 0)
      .to(p.all, { x: -10, rotation: -4, duration: 0.07 })
      .to(p.all, { x: 10, rotation: 4, duration: 0.07, repeat: 3, yoyo: true })
      .to(p.all, { x: 0, rotation: 0, duration: 0.1 })
      .set(p.sweat, { opacity: 1 }, 0.15)
      .fromTo(p.sweat, { y: 0, scale: 0.4, transformOrigin: "50% 0%" }, { scale: 1, duration: 0.3, ease: "back.out(2)" }, 0.15)
      .to(p.sweat, { y: 30, opacity: 0, duration: 0.8, ease: "power1.in" }, 0.9)
      .to(p.pupils, { x: -5, duration: 0.15 }, 0.5)
      .to(p.pupils, { x: 5, duration: 0.15 }, 0.7)
      .to(p.pupils, { x: 0, duration: 0.15 }, 0.9)
      .to({}, { duration: 0.3 });
    return back(p, t);
  },
  sad(p) {
    const t = gsap.timeline();
    t.add(mo(p, "sad", 0.3))
      .to(p.browL, { rotation: -16, y: 3, duration: 0.3 }, 0)
      .to(p.browR, { rotation: 16, y: 3, duration: 0.3 }, 0)
      .to(p.lids, { scaleY: 0.32, duration: 0.3 }, 0)
      .to(p.pupils, { y: 5, duration: 0.3 }, 0)
      .to(p.all, { scaleY: 0.95, scaleX: 1.03, duration: 0.4 }, 0)
      .to(p.sprout, { rotation: 32, duration: 0.7, ease: "bounce.out" }, 0)
      .set(p.tear, { opacity: 1, y: 0 }, 0.5)
      .to(p.tear, { y: 46, opacity: 0, duration: 0.8, ease: "power1.in" }, 0.7)
      .to(p.all, { scaleY: 1, scaleX: 1, duration: 0.4 }, 1.6);
    return back(p, t);
  },
  wilt(p) {
    const t = gsap.timeline();
    if (p.dryM) t.call(() => p.all.setAttribute("filter", `url(#${p.dryId})`)).to(p.dryM, { attr: { values: 0.3 }, duration: 0.8 }, 0);
    t.to(p.dryB, { opacity: 0.75, duration: 0.8 }, 0)
      .to(p.sprout, { rotation: 42, scaleY: 0.85, duration: 0.9, ease: "power2.inOut" }, 0)
      .to(p.all, { scaleY: 0.92, scaleX: 1.05, duration: 0.8 }, 0)
      .to(p.lids, { scaleY: 0.5, duration: 0.5 }, 0.2)
      .add(mo(p, "sad", 0.4), 0.2);
    return t;
  },
  drink(p) {
    const t = gsap.timeline();
    t.set(p.dropFx, { opacity: 1, y: -60, scale: 1, transformOrigin: "50% 100%" })
      .to(p.pupils, { y: -9, duration: 0.25 }, 0)
      .add(mo(p, "O"), 0)
      .to(p.dropFx, { y: 70, duration: 0.45, ease: "power2.in" }, 0.1)
      .to(p.dropFx, { scaleY: 0.3, scaleX: 1.6, opacity: 0, duration: 0.15 })
      .call(() => void (!p.quiet && fx("drop")))
      .to(p.dryB, { opacity: 0, duration: 0.6 }, "<")
      .to(p.lids, { scaleY: 0, duration: 0.3 }, "<")
      .to(p.sprout, { rotation: 0, scaleY: 1.25, duration: 0.3, ease: "back.out(2)" }, "<")
      .to(p.sprout, { scaleY: 1, duration: 0.8, ease: "elastic.out(1,.3)" })
      .to(p.all, { scaleY: 1, scaleX: 1, duration: 0.5, ease: "elastic.out(1,.4)" }, "<")
      .add(mo(p, "big"), "<")
      .to(p.lidsB, { scaleY: 0.4, duration: 0.2 }, "<")
      .to(p.pupils, { y: 0, duration: 0.2 }, "<");
    if (p.dryM) t.to(p.dryM, { attr: { values: 1 }, duration: 0.6 }, 0.75).call(() => p.all.removeAttribute("filter"));
    return back(p, t);
  },
  grow(p) {
    const t = gsap.timeline();
    t.to(p.all, { scaleY: 0.85, scaleX: 1.12, duration: 0.25, ease: "power2.in" })
      .to(p.sprout, { scaleY: 0.6, duration: 0.25 }, "<")
      .add(mo(p, "O"), "<")
      .to(p.all, { scaleY: 1.15, scaleX: 0.92, duration: 0.25, ease: "power2.out" })
      .to(p.sprout, { scaleY: 1.4, duration: 0.25, ease: "power2.out" }, "<")
      .add(mo(p, "wow", 0.1), "<")
      .set(p.spark, { opacity: 1 }, "<")
      .from(p.spark.children, { scale: 0, transformOrigin: "50% 50%", stagger: 0.06, duration: 0.4, ease: "back.out(3)" }, "<")
      .to(p.all, { scaleY: 1, scaleX: 1, duration: 0.7, ease: "elastic.out(1,.35)" })
      .to(p.sprout, { scaleY: 1, duration: 0.9, ease: "elastic.out(1,.25)" }, "<")
      .add(mo(p, "big"), "<")
      .to(p.spark, { opacity: 0, duration: 0.4 }, "+=0.3");
    snd(p, t, "grow", 0);
    return back(p, t);
  },
  sleep(p) {
    const t = gsap.timeline();
    t.to(p.lids, { scaleY: 0.6, duration: 0.5 })
      .to(p.lids, { scaleY: 1, duration: 0.6 })
      .add(mo(p, "sleep", 0.4), 0.6)
      .to(p.sprout, { rotation: 30, duration: 0.8, ease: "sine.inOut" }, 0.4)
      .set(p.zzz, { opacity: 1 }, 1)
      .from(p.zzz.children, { opacity: 0, y: 10, scale: 0.4, transformOrigin: "0% 100%", stagger: 0.35, duration: 0.5 }, 1)
      .to(p.all, { scaleY: 0.96, scaleX: 1.03, duration: 1, yoyo: true, repeat: 3, ease: "sine.inOut" }, 1)
      .to(p.zzz, { y: -10, duration: 1, yoyo: true, repeat: 3, ease: "sine.inOut" }, 1);
    return t;
  },
  spin(p) {
    const t = gsap.timeline();
    t.add(mo(p, "big"))
      .to(p.all, { scaleY: 0.85, scaleX: 1.1, duration: 0.12 })
      .to(p.all, { y: -60, scaleY: 1.1, scaleX: 0.9, duration: 0.25, ease: "power2.out" })
      .to(p.shadow, { scale: 0.5, duration: 0.25 }, "<")
      .to(p.all, { scaleX: -0.9, duration: 0.12 })
      .to(p.all, { scaleX: 0.9, duration: 0.12 })
      .to(p.all, { scaleX: -0.9, duration: 0.12 })
      .to(p.all, { scaleX: 1, duration: 0.12 })
      .to(p.all, { y: 0, duration: 0.22, ease: "power2.in" })
      .to(p.shadow, { scale: 1, duration: 0.22 }, "<")
      .to(p.all, { scaleY: 0.86, scaleX: 1.12, duration: 0.08 })
      .to(p.all, { scaleY: 1, scaleX: 1, duration: 0.6, ease: "elastic.out(1,.4)" });
    snd(p, t, "whoosh", 0.2);
    return back(p, t);
  },
  wink(p) {
    const t = gsap.timeline();
    t.add(mo(p, "grin"))
      .to(p.lidR, { scaleY: 1, duration: 0.12 }, 0)
      .to(p.all, { rotation: 6, duration: 0.3, ease: "back.out(2)" }, 0)
      .set(p.hearts, { opacity: 1 }, 0.2)
      .fromTo(p.hearts, { scale: 0, y: 10 }, { scale: 1, y: -10, duration: 0.5, ease: "back.out(3)" }, 0.2)
      .to(p.hearts, { opacity: 0, y: -30, duration: 0.5 }, 1);
    return back(p, t);
  },
  point(p) {
    const t = gsap.timeline();
    t.add(mo(p, "smile"))
      .to(p.armR, { rotation: -78, duration: 0.3, ease: "back.out(2)" })
      .to(p.pupils, { x: 7, duration: 0.2 }, 0)
      .to(p.all, { rotation: 5, duration: 0.3 }, 0)
      .to(p.armR, { rotation: -70, x: 6, duration: 0.18, yoyo: true, repeat: 5, ease: "sine.inOut" });
    return back(p, t);
  },
  shy(p) {
    const t = gsap.timeline();
    t.to(p.cheeks, { scale: 1.6, opacity: 0.95, duration: 0.3 })
      .to(p.pupils, { x: -6, y: 5, duration: 0.3 }, 0)
      .add(mo(p, "grin"), 0)
      .to(p.armL, { rotation: -55, duration: 0.35, ease: "back.out(2)" }, 0)
      .to(p.all, { rotation: -5, duration: 0.4, yoyo: true, repeat: 3, ease: "sine.inOut" }, 0.1)
      .to(p.cheeks, { scale: 1, opacity: 0.55, duration: 0.3 }, 1.7);
    return back(p, t);
  },
  peek(p) {
    const t = gsap.timeline();
    t.set(p.all, { y: 150 })
      .to(p.all, { y: 40, duration: 0.5, ease: "back.out(2)" })
      .to(p.pupils, { x: -6, duration: 0.2 })
      .to(p.pupils, { x: 6, duration: 0.25 }, "+=.25")
      .to(p.pupils, { x: 0, duration: 0.2 }, "+=.25")
      .to(p.all, { y: 0, duration: 0.35, ease: "back.out(2)" })
      .add(mo(p, "big"), "<")
      .to(p.armR, { rotation: -120, duration: 0.3 }, "<")
      .to(p.armR, { rotation: -95, duration: 0.15, yoyo: true, repeat: 3 });
    return back(p, t);
  },
};
