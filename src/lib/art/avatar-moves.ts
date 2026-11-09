/** The avatar's moves on the web (GSAP), on markup from @shared/art/avatar. Client-only. */
import { gsap } from "gsap";
import { AVATAR_MOUTHS, type AvatarMouth } from "@shared/art/avatar";

type El = Element;
export interface AvatarParts {
  el: SVGSVGElement;
  all: El;
  head: El;
  hjb: El | null;
  uaL: El;
  uaR: El;
  faL: El;
  faR: El;
  legL: El;
  legR: El;
  shinL: El;
  shinR: El;
  eyes: El;
  kp: El;
  bL: El;
  bR: El;
  mouth: El;
  shadow: El;
  fx: El;
  stop: () => void;
}

export function avatarParts(el: SVGSVGElement): AvatarParts {
  const q = (s: string) => el.querySelector(s) as El;
  el.querySelectorAll(".uaR,.faR").forEach((n) => n.removeAttribute("transform"));
  const p = {
    el,
    all: q(".all"),
    head: q(".head"),
    hjb: el.querySelector(".hjb"),
    uaL: q(".uaL"),
    uaR: q(".uaR"),
    faL: q(".faL"),
    faR: q(".faR"),
    legL: q(".legL"),
    legR: q(".legR"),
    shinL: q(".shinL"),
    shinR: q(".shinR"),
    eyes: q(".eyes"),
    kp: q(".kp"),
    bL: q(".kbL"),
    bR: q(".kbR"),
    mouth: q(".kmouth"),
    shadow: q(".shadow"),
    fx: q(".kfx"),
    stop: () => {},
  } as AvatarParts;
  gsap.set(p.all, { svgOrigin: "90 282" });
  gsap.set(p.head, { svgOrigin: "90 126" });
  gsap.set(p.uaL, { svgOrigin: "56 136" });
  gsap.set(p.uaR, { svgOrigin: "124 136" });
  gsap.set(p.faL, { svgOrigin: "50 168" });
  gsap.set(p.faR, { svgOrigin: "130 168" });
  gsap.set(p.legL, { svgOrigin: "79 208" });
  gsap.set(p.legR, { svgOrigin: "101 208" });
  gsap.set(p.shinL, { svgOrigin: "79 240" });
  gsap.set(p.shinR, { svgOrigin: "101 240" });
  gsap.set(p.shadow, { svgOrigin: "90 290" });
  gsap.set([p.eyes, p.bL, p.bR], { transformOrigin: "50% 50%" });
  if (p.hjb) {
    // Follow-through: the hijab trails the head by a moment.
    const hjb = p.hjb;
    gsap.set(hjb, { svgOrigin: "90 40" });
    let r = 0;
    const tick = () => {
      const h = Number(gsap.getProperty(p.head, "rotation")) || 0;
      r += (-h * 0.35 - r) * 0.12;
      gsap.set(hjb, { rotation: r });
    };
    gsap.ticker.add(tick);
    p.stop = () => gsap.ticker.remove(tick);
  }
  avatarReset(p);
  return p;
}

export function avatarReset(p: AvatarParts) {
  gsap.set([p.all, p.head, p.uaL, p.uaR, p.faL, p.faR, p.legL, p.legR, p.shinL, p.shinR, p.eyes, p.kp, p.bL, p.bR, p.shadow, p.fx], {
    x: 0,
    y: 0,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
  });
  gsap.set(p.fx, { opacity: 0 });
  gsap.set(p.mouth, { attr: { d: AVATAR_MOUTHS.smile } });
}

const km = (p: AvatarParts, k: AvatarMouth, d = 0.14) => gsap.to(p.mouth, { attr: { d: AVATAR_MOUTHS[k] }, duration: d });
function hop(p: AvatarParts, h = 40) {
  return gsap
    .timeline()
    .to(p.all, { scaleY: 0.9, scaleX: 1.06, duration: 0.12 })
    .to(p.all, { y: -h, scaleY: 1.05, scaleX: 0.96, duration: 0.26, ease: "power2.out" })
    .to([p.shinL, p.shinR], { rotation: 28, duration: 0.2 }, "<")
    .to(p.shadow, { scale: 0.6, duration: 0.26 }, "<")
    .to(p.all, { y: 0, scaleY: 1, scaleX: 1, duration: 0.22, ease: "power2.in" })
    .to([p.shinL, p.shinR], { rotation: 0, duration: 0.2 }, "<")
    .to(p.shadow, { scale: 1, duration: 0.22 }, "<")
    .to(p.all, { scaleY: 0.93, scaleX: 1.05, duration: 0.07 })
    .to(p.all, { scaleY: 1, scaleX: 1, duration: 0.5, ease: "elastic.out(1,.4)" });
}
const back = (p: AvatarParts, t: gsap.core.Timeline) =>
  t
    .to([p.all, p.head, p.uaL, p.uaR, p.faL, p.faR, p.legL, p.legR, p.shinL, p.shinR, p.bL, p.bR], {
      rotation: 0,
      x: 0,
      y: 0,
      duration: 0.4,
      ease: "back.out(1.4)",
    })
    .to([p.eyes, p.all], { scaleY: 1, duration: 0.3 }, "<")
    .to(p.kp, { x: 0, y: 0 }, "<")
    .add(km(p, "smile"), "<");

export type AvatarMove = "idle" | "wave" | "cheer" | "clap" | "jump" | "walk" | "think" | "talk" | "point" | "sad";
export const AVATAR_MOVES: Record<AvatarMove, (p: AvatarParts) => gsap.core.Timeline> = {
  idle: (p) =>
    gsap
      .timeline({ repeat: -1 })
      .to(p.head, { rotation: 3, duration: 1.3, ease: "sine.inOut", yoyo: true, repeat: 1 })
      .to(p.all, { scaleY: 0.988, duration: 1.3, ease: "sine.inOut", yoyo: true, repeat: 1 }, 0)
      .to(p.uaL, { rotation: -4, duration: 1.3, yoyo: true, repeat: 1, ease: "sine.inOut" }, 0)
      .to(p.uaR, { rotation: 4, duration: 1.3, yoyo: true, repeat: 1, ease: "sine.inOut" }, 0)
      .to(p.eyes, { scaleY: 0.1, duration: 0.07, yoyo: true, repeat: 1 }, 1.6)
      .to(p.kp, { x: 2, duration: 0.3 }, 0.4)
      .to(p.kp, { x: 0, duration: 0.3 }, 2),
  wave: (p) =>
    back(
      p,
      gsap
        .timeline()
        .add(km(p, "big"))
        .to([p.bL, p.bR], { y: -3, duration: 0.2 }, 0)
        .to(p.uaR, { rotation: -150, duration: 0.35, ease: "back.out(2)" }, 0)
        .to(p.faR, { rotation: -20, duration: 0.3 }, 0.1)
        .to(p.faR, { rotation: 20, duration: 0.16, yoyo: true, repeat: 5, ease: "sine.inOut" })
        .to(p.head, { rotation: -5, duration: 0.34, yoyo: true, repeat: 2 }, 0.35),
    ),
  cheer: (p) =>
    back(
      p,
      gsap
        .timeline()
        .add(km(p, "big"))
        .to(p.uaL, { rotation: 160, duration: 0.3, ease: "back.out(2)" }, 0)
        .to(p.uaR, { rotation: -160, duration: 0.3, ease: "back.out(2)" }, 0)
        .to(p.faL, { rotation: 20, duration: 0.3 }, 0)
        .to(p.faR, { rotation: -20, duration: 0.3 }, 0)
        .add(hop(p, 46), 0.1)
        .add(hop(p, 36), 0.85),
    ),
  clap: (p) => {
    const t = gsap
      .timeline()
      .add(km(p, "big"))
      .to(p.uaL, { rotation: -32, duration: 0.25 }, 0)
      .to(p.uaR, { rotation: 32, duration: 0.25 }, 0)
      .to(p.faL, { rotation: -95, duration: 0.25 }, 0)
      .to(p.faR, { rotation: 95, duration: 0.25 }, 0);
    for (let i = 0; i < 5; i++)
      t.to(p.faL, { rotation: -80, duration: 0.1 })
        .to(p.faR, { rotation: 80, duration: 0.1 }, "<")
        .to(p.faL, { rotation: -98, duration: 0.1 })
        .to(p.faR, { rotation: 98, duration: 0.1 }, "<");
    return back(p, t);
  },
  jump: (p) =>
    back(
      p,
      gsap.timeline().add(km(p, "big")).to(p.uaL, { rotation: 60, duration: 0.2 }, 0.1).to(p.uaR, { rotation: -60, duration: 0.2 }, 0.1).add(hop(p, 60), 0),
    ),
  walk: (p) => {
    const t = gsap.timeline();
    for (let i = 0; i < 6; i++) {
      const s = i % 2 ? 1 : -1,
        at = i * 0.24;
      t.to(p.legL, { rotation: 20 * s, duration: 0.24, ease: "sine.inOut" }, at)
        .to(p.legR, { rotation: -20 * s, duration: 0.24, ease: "sine.inOut" }, at)
        .to(p.shinL, { rotation: s > 0 ? 0 : 26, duration: 0.24 }, at)
        .to(p.shinR, { rotation: s > 0 ? 26 : 0, duration: 0.24 }, at)
        .to(p.uaL, { rotation: -18 * s, duration: 0.24 }, at)
        .to(p.uaR, { rotation: -18 * s, duration: 0.24 }, at)
        .to(p.all, { y: -5, duration: 0.12, yoyo: true, repeat: 1 }, at)
        .to(p.head, { rotation: 2 * s, duration: 0.24 }, at);
    }
    return back(p, t);
  },
  think: (p) =>
    back(
      p,
      gsap
        .timeline()
        .to(p.head, { rotation: -7, duration: 0.3 })
        .to(p.kp, { x: -2, y: -4, duration: 0.3 }, 0)
        .add(km(p, "flat"), 0)
        .to(p.uaR, { rotation: 20, duration: 0.35 }, 0)
        .to(p.faR, { rotation: 140, duration: 0.4, ease: "back.out(1.5)" }, 0)
        .set(p.fx, { opacity: 1 }, 0.35)
        .from(p.fx.children, { scale: 0, transformOrigin: "50% 50%", stagger: 0.2, duration: 0.3, ease: "back.out(3)" }, 0.35)
        .to({}, { duration: 1 })
        .to(p.fx, { opacity: 0 }),
    ),
  talk: (p) => {
    const t = gsap.timeline(),
      seq: AvatarMouth[] = ["O", "big", "smile", "O", "flat", "big", "O", "smile", "big", "flat"];
    seq.forEach((k, i) => t.add(km(p, k, 0.08), i * 0.12));
    return back(
      p,
      t
        .to(p.uaL, { rotation: -20, duration: 0.25 }, 0.1)
        .to(p.faL, { rotation: -70, duration: 0.25 }, 0.1)
        .to(p.head, { rotation: 3, duration: 0.24, yoyo: true, repeat: 3 }, 0.1),
    );
  },
  point: (p) =>
    back(
      p,
      gsap
        .timeline()
        .add(km(p, "smile"))
        .to(p.uaR, { rotation: -82, duration: 0.3, ease: "back.out(2)" })
        .to(p.faR, { rotation: -6, duration: 0.3 }, "<")
        .to(p.uaR, { rotation: -76, duration: 0.16, yoyo: true, repeat: 5 }),
    ),
  sad: (p) =>
    back(
      p,
      gsap
        .timeline()
        .add(km(p, "sad"))
        .to(p.head, { rotation: 6, y: 4, duration: 0.4 }, 0)
        .to(p.eyes, { scaleY: 0.6, duration: 0.3 }, 0)
        .to(p.bL, { rotation: -14, duration: 0.3 }, 0)
        .to(p.bR, { rotation: 14, duration: 0.3 }, 0)
        .to(p.all, { scaleY: 0.97, duration: 0.4 }, 0)
        .to({}, { duration: 1.3 }),
    ),
};
