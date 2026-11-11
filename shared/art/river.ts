/**
 * The river map: one world per level, the units are lily pads on a river that flows from a spring
 * to the level's dam. Pure SVG markup (no user input) for the web and mobile. Width 360, height grows
 * with the number of units. Classes (.flow, .rip, .boat, .tree) are animation hooks on the web.
 */
import { avatarMarkup, type AvatarConfig } from "./avatar";
import { paint } from "./paint";

export type NodeState = "done" | "now" | "open" | "locked";
export type WorldId = "spring" | "valley" | "river" | "delta" | "sea";

export interface World {
  id: WorldId;
  name: string;
  sky: string;
  land: string;
  land2: string;
  water: string;
  water2: string;
  tree: string;
  tree2: string;
  rock: string;
  band: string;
}
export const WORLDS: Record<WorldId, World> = {
  spring: {
    id: "spring",
    name: "النبع",
    sky: "#DDF6EC",
    land: "#A9E6C9",
    land2: "#86D8B2",
    water: "#8EDDF5",
    water2: "#C9F1FF",
    tree: "#22B38A",
    tree2: "#13876A",
    rock: "#C9D6D1",
    band: "#0E6E5C",
  },
  valley: {
    id: "valley",
    name: "الوادي",
    sky: "#F8EDD4",
    land: "#EBD3A0",
    land2: "#DDBB7C",
    water: "#6CCBF2",
    water2: "#B8E9FA",
    tree: "#6FA84B",
    tree2: "#4C7F33",
    rock: "#C9A87A",
    band: "#8A6A2E",
  },
  river: {
    id: "river",
    name: "النهر",
    sky: "#D3F2E0",
    land: "#8ED8A8",
    land2: "#5DC48A",
    water: "#2E9BD6",
    water2: "#8FD3F7",
    tree: "#1E9A70",
    tree2: "#13715A",
    rock: "#B4C3BE",
    band: "#13715A",
  },
  delta: {
    id: "delta",
    name: "الدلتا",
    sky: "#DDF3F0",
    land: "#9ED9C8",
    land2: "#6FC2AC",
    water: "#2AA5B8",
    water2: "#9BE3E9",
    tree: "#3BA58A",
    tree2: "#25806A",
    rock: "#BFD8D2",
    band: "#1F7A6E",
  },
  sea: {
    id: "sea",
    name: "البحر",
    sky: "#D7EEFB",
    land: "#F3E3C3",
    land2: "#E6CD9C",
    water: "#1C6FA3",
    water2: "#4FA6DA",
    tree: "#2FB59A",
    tree2: "#1C8A73",
    rock: "#E2CFA4",
    band: "#1C4F7A",
  },
};

/** The world of a level code: A1 spring, A2 valley, B1 river, B2 delta, anything after: sea. */
export function worldFor(levelCode: string | null | undefined): World {
  const c = (levelCode ?? "").toUpperCase();
  return WORLDS[
    c.startsWith("A1") ? "spring" : c.startsWith("A2") ? "valley" : c.startsWith("B1") ? "river" : c.startsWith("B2") ? "delta" : c ? "sea" : "spring"
  ];
}

export interface RiverNode {
  state: NodeState;
  label: string;
}

export interface RiverLayout {
  width: number;
  height: number;
  points: { x: number; y: number }[];
  path: string;
}

const W = 360,
  TOP = 110,
  STEP = 124,
  BOTTOM = 150;

/** `minHeight`: a screen taller than the map (few units): the river stretches so it always fills it. */
export function riverLayout(count: number, minHeight = 0): RiverLayout {
  const n = Math.max(1, count);
  const natural = TOP + (n - 1) * STEP + BOTTOM;
  const height = Math.max(natural, Math.round(minHeight));
  // Spread the pads over the extra height (a lone pad sits in the middle).
  const step = n > 1 ? Math.min(STEP * 2, STEP + (height - natural) / (n - 1)) : STEP;
  const top = n > 1 ? TOP + Math.max(0, height - (TOP + (n - 1) * step + BOTTOM)) / 2 : Math.max(TOP, height * 0.45);
  const points = Array.from({ length: n }, (_, i) => ({ x: Math.round(180 + 78 * Math.sin(i * 1.05 + 0.4)), y: Math.round(top + i * step) }));
  // A smooth curve through the spring, every pad and the dam (Catmull-Rom → cubic Bézier).
  const all = [{ x: 180, y: 20 }, ...points, { x: 180, y: height - 40 }];
  let d = `M${all[0].x} ${all[0].y}`;
  for (let i = 0; i < all.length - 1; i++) {
    const p0 = all[Math.max(0, i - 1)],
      p1 = all[i],
      p2 = all[i + 1],
      p3 = all[Math.min(all.length - 1, i + 2)];
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 },
      c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C${c1.x.toFixed(1)} ${c1.y.toFixed(1)} ${c2.x.toFixed(1)} ${c2.y.toFixed(1)} ${p2.x} ${p2.y}`;
  }
  return { width: W, height, points, path: d };
}

/** Deterministic pseudo-random numbers (same scenery on every render). */
function rand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export interface RiverOptions {
  world: World;
  nodes: RiverNode[];
  /** Draw the student's boat at the current pad. */
  avatar?: AvatarConfig;
  id?: string;
  /** Text labels under the pads. */
  labels?: boolean;
  /** Stretch the river to at least this height (in map units, width 360). */
  minHeight?: number;
}

/** The full map markup for viewBox `0 0 360 ${layout.height}`. */
export function riverMarkup({ world, nodes, avatar, id = "rv", labels = true, minHeight = 0 }: RiverOptions): { markup: string; layout: RiverLayout } {
  const L = riverLayout(nodes.length, minHeight),
    P = paint(id),
    r = rand(nodes.length * 7 + world.id.length);
  const sceneryFor = (y: number, x: number, k: number) => {
    const side = x > 180 ? 34 + r() * 40 : 286 + r() * 40;
    if (k % 3 === 2)
      return `<g transform="translate(${side.toFixed(0)} ${y.toFixed(0)})"><ellipse rx="16" ry="10" fill="${world.rock}"/><ellipse cx="-4" cy="-4" rx="6" ry="3" fill="#fff" opacity=".5"/></g>`;
    return `<g class="tree" transform="translate(${side.toFixed(0)} ${y.toFixed(0)})"><g class="tg"><rect x="-4" y="-4" width="8" height="22" rx="4" fill="${world.tree2}"/><circle cy="-14" r="18" fill="${P.rg(world.tree, 0.4, -0.3)}"/><circle cx="7" cy="-8" r="11" fill="${world.tree2}" opacity=".8"/><circle cx="-6" cy="-22" r="5" fill="#fff" opacity=".35"/></g></g>`;
  };
  const scenery: string[] = [];
  for (let k = 0, y = 70; y < L.height - 60; y += 64, k++) {
    const near = L.points.reduce((a, p) => (Math.abs(p.y - y) < Math.abs(a.y - y) ? p : a), L.points[0]);
    scenery.push(sceneryFor(y, near.x, k));
  }
  const banks = L.points
    .map((p, i) => `<ellipse cx="${p.x > 180 ? 40 : 320}" cy="${p.y + (i % 2 ? 30 : -20)}" rx="${110 + r() * 50}" ry="${70 + r() * 30}" fill="${world.land}"/>`)
    .join("");
  const pad = (n: RiverNode, x: number, y: number, i: number) => {
    const lock = n.state === "locked";
    const base = lock
      ? `<ellipse cx="0" cy="5" rx="30" ry="21" fill="${P.rg(world.rock, 0.2, -0.3)}"/><rect x="-7" y="-1" width="14" height="11" rx="3" fill="#fff" opacity=".9"/><path d="M-4 -1v-4a4 4 0 0 1 8 0v4" stroke="#fff" stroke-width="2.5" fill="none" opacity=".9"/>`
      : `<path d="M0 0 L30 -5 A30 22 0 1 1 26 -14 Z" fill="${P.rg(n.state === "now" ? "#3CC48F" : "#22B38A", 0.4, -0.3)}" transform="translate(0 4)"/><path d="M-18 -6 C-12 -12 -2 -14 6 -13" stroke="#fff" stroke-width="3" fill="none" opacity=".35" stroke-linecap="round"/>`;
    const icon =
      n.state === "done"
        ? [0, 72, 144, 216, 288]
            .map(
              (a) =>
                `<ellipse cx="${(7 * Math.cos((a * Math.PI) / 180)).toFixed(1)}" cy="${(7 * Math.sin((a * Math.PI) / 180) - 2).toFixed(1)}" rx="7" ry="7" fill="${P.rg("#FFD27A", 0.4, -0.2)}"/>`,
            )
            .join("") + `<circle cx="0" cy="-2" r="4.5" fill="#F5A524"/>`
        : n.state === "now"
          ? `<path d="M0 -13l3.8 8 8.8 1.2-6.4 6 1.6 8.7L0 6.8l-7.8 4.1 1.6-8.7-6.4-6 8.8-1.2z" fill="#fff"/>`
          : n.state === "open"
            ? `<circle r="6" fill="#fff" opacity=".85"/>`
            : "";
    const rip =
      n.state === "now"
        ? `<ellipse class="rip" cy="5" rx="34" ry="24" fill="none" stroke="#fff" stroke-width="3"/><ellipse class="rip" cy="5" rx="34" ry="24" fill="none" stroke="#fff" stroke-width="3"/>`
        : "";
    const text = labels
      ? `<g transform="translate(0 44)"><rect x="-36" y="-11" width="72" height="22" rx="11" fill="#fff" opacity="${lock ? 0.7 : 0.95}"/><text y="5" text-anchor="middle" font-size="12" font-weight="700" fill="#0F1F1B" font-family="IBM Plex Sans Arabic, sans-serif">${n.label}</text></g>`
      : "";
    return `<g class="node" data-i="${i}" transform="translate(${x} ${y})">${rip}${base}${icon}${text}</g>`;
  };
  const cur = Math.max(
    0,
    nodes.findIndex((n) => n.state === "now"),
  );
  const boatAt = L.points[cur] ?? L.points[0];
  const boat = avatar
    ? `<g class="boat" transform="translate(${boatAt.x + 40} ${boatAt.y + 2})"><g class="boatB"><path d="M-26 6 C-20 22 20 22 28 4 C10 10 -10 10 -26 6Z" fill="${P.rg("#F5A524", 0.4, -0.3)}"/><path d="M-20 8 L22 6" stroke="#C77F06" stroke-width="2"/><svg x="-20" y="-42" width="40" height="46" viewBox="36 14 108 124" overflow="hidden">${avatarMarkup(avatar, { id: id + "a", filters: false })}</svg></g></g>`
    : "";
  // The body first: its gradients are collected while it is drawn, then emitted in <defs>.
  const body = `<rect width="${W}" height="${L.height}" fill="${world.sky}"/>${banks}
<path d="${L.path}" stroke="${world.land2}" stroke-width="80" stroke-linecap="round" fill="none"/>
<path d="${L.path}" stroke="${world.water}" stroke-width="64" stroke-linecap="round" fill="none"/>
<path d="${L.path}" stroke="${world.water2}" stroke-width="36" stroke-linecap="round" fill="none" opacity=".55"/>
<path class="flow" d="${L.path}" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-dasharray="14 30" fill="none" opacity=".7"/>
<circle cx="180" cy="20" r="40" fill="${world.water}"/><circle cx="180" cy="20" r="24" fill="${world.water2}" opacity=".7"/>
<g transform="translate(180 ${L.height - 40})"><rect x="-58" y="-20" width="116" height="40" rx="12" fill="${P.rg("#9AA6B8", 0.25, -0.35)}"/><path d="M-48 -6 h96 M-48 6 h96" stroke="#7B8698" stroke-width="2"/><path d="M0 -50 C0 -50 -12 -34 -12 -26 a12 12 0 0 0 24 0 C12 -34 0 -50 0 -50Z" fill="${P.rg("#5CC8F0", 0.5, -0.25)}"/></g>
${scenery.join("")}
${nodes.map((n, i) => pad(n, L.points[i].x, L.points[i].y, i)).join("")}
${boat}`;
  const markup = `<defs>${P.defs()}</defs>
${body}`;
  return { markup, layout: L };
}
