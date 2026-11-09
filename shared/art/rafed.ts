/**
 * Rafed (رافد): a green water-drop whose sprout grows through five stages with the student's level.
 * Pure SVG markup (no user input), shared by the web (animated with GSAP) and mobile (react-native-svg).
 * Element classes (.all, .sprout, .armL, .lid …) are the hooks the web animations use.
 */
import { paint } from "./paint";

export type RafedStage = 1 | 2 | 3 | 4 | 5;
export type RafedMood = "idle" | "happy" | "sad" | "think" | "wow" | "sleep" | "wilt" | "wink" | "proud";

export const RAFED_VIEWBOX = "0 -40 240 320";
/** Width / height of the viewBox, for sizing. */
export const RAFED_RATIO = 240 / 320;

export const RAFED_STAGES: { stage: RafedStage; name: string; when: string }[] = [
  { stage: 1, name: "بذرة", when: "المستوى الأول" },
  { stage: 2, name: "برعم", when: "المستوى الثاني" },
  { stage: 3, name: "شتلة", when: "المستوى الثالث" },
  { stage: 4, name: "شجيرة", when: "المستوى الرابع" },
  { stage: 5, name: "شجرة مثمرة", when: "إتمام المسار" },
];
/** Whole-body scale and eye scale per stage (young Rafed has bigger eyes). */
export const STAGE_SCALE = [0.7, 0.8, 0.9, 1, 1.05];
export const STAGE_EYES = [1.14, 1.07, 1, 0.97, 0.95];

/** The stage for a number of completed levels (0 → seed). */
export function stageFor(levelsDone: number, pathDone = false): RafedStage {
  if (pathDone) return 5;
  return Math.min(4, Math.max(1, levelsDone + 1)) as RafedStage;
}

export const RAFED_COLORS = {
  g: "#22B38A",
  gd: "#13876A",
  gdd: "#0C6653",
  gh: "#9BF0D2",
  ink: "#0F1F1B",
  mouth: "#5E160D",
  tongue: "#FF7D6B",
  cheek: "#FF8F7A",
  gold: "#F7B52C",
  goldH: "#FFE08A",
  leafG: "#3CC48F",
  fruit: "#FF8A3D",
  petal: "#FFF1D0",
};
const C = RAFED_COLORS;

/** Mouth shapes (all with the same path structure so they can morph into each other). */
export const RAFED_MOUTHS = {
  smile: "M102 158 Q120 162 138 158 Q120 178 102 158 Z",
  big: "M94 154 Q120 160 146 154 Q120 198 94 154 Z",
  sad: "M104 172 Q120 158 136 172 Q120 167 104 172 Z",
  flat: "M106 166 Q120 166 134 166 Q120 169 106 166 Z",
  O: "M110 160 Q120 150 130 160 Q120 184 110 160 Z",
  E: "M98 160 Q120 164 142 160 Q120 174 98 160 Z",
  wow: "M106 158 Q120 142 134 158 Q120 194 106 158 Z",
  grin: "M102 164 Q124 166 142 154 Q126 180 102 164 Z",
  sleep: "M114 164 Q120 160 126 164 Q120 172 114 164 Z",
} as const;
export type RafedMouth = keyof typeof RAFED_MOUTHS;

const BODY = "M120 58 C140 94 200 120 200 172 C200 222 166 250 120 250 C74 250 40 222 40 172 C40 120 100 94 120 58 Z";

function sprout(s: RafedStage, P: ReturnType<typeof paint>): string {
  const gl = P.rg(C.gold, 0.55, -0.25),
    gg = P.rg(C.leafG, 0.45, -0.3);
  const stem = (d: string) => `<path d="${d}" stroke="${C.gdd}" stroke-width="7" stroke-linecap="round" fill="none"/>`;
  const vein = (d: string) => `<path d="${d}" stroke="${C.goldH}" stroke-width="2.6" stroke-linecap="round" fill="none" opacity=".9"/>`;
  const L = `<path d="M121 36 C105 14 77 16 73 30 C71 42 99 48 121 36 Z" fill="${gl}"/>${vein("M118 34 C104 30 91 28 80 30")}`;
  const R = `<path d="M123 30 C135 6 167 4 171 18 C175 32 147 40 123 30 Z" fill="${gl}"/>${vein("M127 27 C140 21 152 17 164 16")}`;
  const big = `<path d="M121 42 C98 14 60 16 56 34 C54 50 92 56 121 42Z" fill="${gl}"/>${vein("M118 40 C100 34 82 31 66 33")}<path d="M123 32 C138 2 180 -2 186 16 C190 34 156 42 123 32Z" fill="${gl}"/>${vein("M127 29 C144 20 162 14 178 13")}<path d="M125 16 C116 0 124 -16 136 -16 C144 -2 136 14 125 16Z" fill="${gg}"/>`;
  if (s === 1) return stem("M120 62 C117 54 118 47 124 44") + `<path d="M124 45 C128 34 142 32 145 38 C147 46 134 50 124 45Z" fill="${gg}"/>`;
  if (s === 2) return stem("M120 62 C118 50 119 40 123 32") + R;
  if (s === 3) return stem("M120 62 C118 46 119 36 123 28") + L + R;
  if (s === 4) return stem("M120 62 C117 42 119 26 125 12") + big;
  const petals = [0, 72, 144, 216, 288]
    .map(
      (a) =>
        `<ellipse cx="${(132 + 10 * Math.cos((a * Math.PI) / 180)).toFixed(1)}" cy="${(-22 + 10 * Math.sin((a * Math.PI) / 180)).toFixed(1)}" rx="8" ry="8" fill="${P.rg(C.petal, 0.4, -0.12)}"/>`,
    )
    .join("");
  const fruit = (x: number, y: number) =>
    `<path d="M${x} ${y - 10} v-6" stroke="${C.gdd}" stroke-width="3" stroke-linecap="round"/><circle cx="${x}" cy="${y}" r="9" fill="${P.rg(C.fruit, 0.45, -0.25)}"/><circle cx="${x - 3}" cy="${y - 3}" r="2.5" fill="#fff" opacity=".7"/>`;
  return (
    stem("M120 62 C117 42 119 26 125 12") +
    big +
    petals +
    `<circle cx="132" cy="-22" r="7" fill="${P.rg(C.gold, 0.4, -0.3)}"/>` +
    fruit(72, 58) +
    fruit(174, 48)
  );
}

/** scaleY about the top (y0) as an SVG matrix, for static lid poses. */
const lidT = (s: number, y0: number) => (s ? `transform="matrix(1 0 0 ${s} 0 ${(y0 * (1 - s)).toFixed(2)})"` : `transform="matrix(1 0 0 0.0001 0 ${y0})"`);

function eye(cx: number, id: string, side: "L" | "R", lid: number, lidB: number, look: [number, number], P: ReturnType<typeof paint>): string {
  return `<g class="eye${side}"><ellipse cx="${cx}" cy="120" rx="21" ry="24" fill="${P.rg("#FFFFFF", 0, -0.08)}"/><g clip-path="url(#${id}e${side})">
<path d="M${cx - 21} 128 C${cx - 16} 146 ${cx + 16} 146 ${cx + 21} 128 C${cx + 16} 140 ${cx - 16} 140 ${cx - 21} 128Z" fill="#D5ECE4"/>
<g class="pupil" transform="translate(${look[0]} ${look[1]})"><circle cx="${cx + 3}" cy="123" r="12.5" fill="${P.rg("#1F6B57", 0.3, -0.3)}"/><circle cx="${cx + 3}" cy="123" r="8.5" fill="${C.ink}"/><circle cx="${cx + 7}" cy="117" r="4.4" fill="#fff"/><circle cx="${cx - 1}" cy="128.5" r="2" fill="#fff"/></g>
<rect class="lid" x="${cx - 26}" y="94" width="52" height="54" fill="${C.g}" ${lidT(lid, 94)}/><rect class="lidB" x="${cx - 26}" y="144" width="52" height="30" fill="${C.g}" ${lidB ? `transform="matrix(1 0 0 ${lidB} 0 ${(174 * (1 - lidB)).toFixed(2)})"` : `transform="matrix(1 0 0 0.0001 0 174)"`}/></g></g>`;
}

function arm(P: ReturnType<typeof paint>): string {
  return `<path d="M56 130 C34 132 17 150 13 172 C10 189 28 196 36 185 C42 172 52 160 64 152 Z" fill="${P.rg("#159A76", 0.35, -0.32)}"/><circle cx="22" cy="184" r="13.5" fill="${P.rg("#1AAE86", 0.45, -0.3)}"/><circle cx="17" cy="178" r="3.2" fill="#fff" opacity=".55"/><path d="M50 136 C36 140 26 150 21 162" stroke="#9BF0D2" stroke-width="2.5" fill="none" opacity=".5" stroke-linecap="round"/>`;
}

export interface RafedOptions {
  stage?: RafedStage;
  mood?: RafedMood;
  /** Right arm raised (waving). */
  wave?: boolean;
  /** Unique id prefix (required when several Rafeds share a page). */
  id?: string;
  /** Blur filters (off on mobile, where react-native-svg ignores them). */
  filters?: boolean;
}

/** Rafed's SVG inner markup for viewBox RAFED_VIEWBOX. */
export function rafedMarkup({ stage = 3, mood = "idle", wave = false, id = "rf", filters = true }: RafedOptions = {}): string {
  const P = paint(id);
  const M = RAFED_MOUTHS;
  const pose = {
    mouth: { idle: M.smile, happy: M.big, sad: M.sad, think: M.flat, wow: M.wow, sleep: M.sleep, wilt: M.sad, wink: M.grin, proud: M.grin }[mood],
    lid: { sleep: 1, sad: 0.32, wilt: 0.5 }[mood as string] ?? 0,
    lidR: mood === "wink" ? 1 : undefined,
    lidB: { happy: 0.4, proud: 0.4, wink: 0.3 }[mood as string] ?? 0,
    look: (mood === "think" ? [-5, -8] : mood === "sad" || mood === "wilt" ? [0, 5] : [0, 0]) as [number, number],
    brow: mood === "sad" || mood === "wilt" ? 16 : 0,
    browY: mood === "happy" || mood === "wow" ? -7 : 0,
    droop: mood === "wilt" ? 42 : mood === "sad" ? 30 : mood === "sleep" ? 28 : 0,
  };
  const blur = filters ? ` filter="url(#${id}b)"` : "";
  const soft = filters ? ` filter="url(#${id}s)"` : "";
  const dry = mood === "wilt";
  const bodyFill = P.rg(C.g, 0.55, -0.4);
  const parts = `
<ellipse class="shadow" cx="120" cy="268" rx="62" ry="9" fill="#06261E" opacity=".2"${soft}/>
<g class="stg" transform="translate(120 266) scale(${STAGE_SCALE[stage - 1]}) translate(-120 -266)"><g class="all"${dry ? ` filter="url(#${id}d)"` : ""}>
<rect class="footL" x="72" y="238" width="40" height="26" rx="13" fill="${P.rg(C.gd, 0.25, -0.35)}"/>
<rect class="footR" x="128" y="238" width="40" height="26" rx="13" fill="${P.rg(C.gd, 0.25, -0.35)}"/>
<g class="sprout" transform="rotate(${pose.droop} 121 62)">${sprout(stage, P)}</g>
<g class="body">
<path d="${BODY}" fill="${bodyFill}"/>
<path class="dryB" d="${BODY}" fill="${P.rg("#A8A35E", 0.35, -0.35)}" opacity="${dry ? 0.75 : 0}"/>
<path d="M80 150 C82 126 96 104 112 88" stroke="#fff" stroke-width="9" stroke-linecap="round" fill="none" opacity=".5"${blur}/>
<circle cx="74" cy="170" r="5" fill="#fff" opacity=".6"/>
<path d="M186 150 C197 172 196 200 180 224" stroke="${C.gh}" stroke-width="4" stroke-linecap="round" fill="none" opacity=".75"/>
<path d="M74 230 C94 246 146 246 166 230" stroke="#fff" stroke-width="4" stroke-linecap="round" fill="none" opacity=".25"/>
<g class="face"><g transform="translate(0 42)">
<ellipse class="cheek" cx="68" cy="152" rx="10" ry="6" fill="${C.cheek}" opacity=".55"/><ellipse class="cheek" cx="172" cy="152" rx="10" ry="6" fill="${C.cheek}" opacity=".55"/>
<g class="eyesW" transform="translate(120 120) scale(${STAGE_EYES[stage - 1]}) translate(-120 -120)">${eye(94, id, "L", pose.lid, pose.lidB, pose.look, P)}${eye(146, id, "R", pose.lidR ?? pose.lid, pose.lidB, pose.look, P)}</g>
<rect class="browL" x="76" y="${83 + pose.browY}" width="34" height="9" rx="4.5" fill="${C.gdd}" transform="rotate(${-pose.brow} 93 ${87 + pose.browY})"/>
<rect class="browR" x="130" y="${83 + pose.browY}" width="34" height="9" rx="4.5" fill="${C.gdd}" transform="rotate(${pose.brow} 147 ${87 + pose.browY})"/>
<g class="mouth"><use href="#${id}m"/><g clip-path="url(#${id}mc)"><rect x="98" y="150" width="44" height="8" rx="2" fill="#fff"/><ellipse cx="120" cy="186" rx="16" ry="11" fill="${C.tongue}"/></g></g>
</g></g>
</g>
<g class="armL"><g transform="translate(0 42)">${arm(P)}</g></g>
<g class="armR"${wave ? ` transform="rotate(-115 186 176)"` : ""}><g transform="translate(0 42) matrix(-1 0 0 1 240 0)">${arm(P)}</g></g>
<path class="fx tear" d="M78 188 C78 188 72 199 72 203 a6 6 0 0 0 12 0 C84 199 78 188 78 188Z" fill="#57B8F0" opacity="0"/>
<path class="fx sweat" d="M192 104 C192 104 183 117 183 123 a9 9 0 0 0 18 0 C201 117 192 104 192 104Z" fill="#8FD3F7" opacity="0"/>
<g class="fx zzz" opacity="${mood === "sleep" ? 1 : 0}" font-family="Inter,sans-serif" font-weight="800" fill="${C.gdd}"><text x="180" y="100" font-size="22">z</text><text x="198" y="76" font-size="28">z</text><text x="218" y="48" font-size="36">Z</text></g>
<g class="fx bulb" opacity="0"><g stroke="#F5A524" stroke-width="5" stroke-linecap="round"><path d="M206 -14 v-12"/><path d="M178 -2 l-9 -7"/><path d="M234 -2 l9 -7"/></g><circle cx="206" cy="22" r="20" fill="${P.rg("#FFD95A", 0.5, -0.2)}"/><rect x="197" y="40" width="18" height="14" rx="4" fill="#A7B4AF"/></g>
<g class="fx dots" opacity="${mood === "think" ? 1 : 0}"><circle cx="186" cy="108" r="6" fill="#C9D6D1"/><circle cx="204" cy="84" r="9" fill="#C9D6D1"/><circle cx="226" cy="54" r="14" fill="#C9D6D1"/></g>
<g class="fx hearts" opacity="${mood === "wink" ? 1 : 0}"><path d="M54 92 c-6-8-18-2-12 8 l12 12 12-12c6-10-6-16-12-8z" fill="#FF6B8A"/><path d="M190 80 c-5-6-14-1-9 6 l9 9 9-9c5-7-4-12-9-6z" fill="#FF6B8A"/></g>
<g class="fx notes" opacity="0" fill="${C.gdd}"><path d="M196 96 v-26 l14 -4 v24" stroke="${C.gdd}" stroke-width="3" fill="none"/><circle cx="192" cy="96" r="5"/><circle cx="206" cy="90" r="5"/></g>
<path class="fx dropFx" d="M122 -80 C122 -80 110 -62 110 -54 a12 12 0 0 0 24 0 C134 -62 122 -80 122 -80Z" fill="${P.rg("#6CCBF2", 0.5, -0.2)}" opacity="0"/>
<g class="fx spark" opacity="${mood === "proud" ? 1 : 0}" fill="#F5A524">${[
    [40, 90],
    [204, 140],
    [30, 220],
    [214, 236],
  ]
    .map(([x, y]) => `<path d="M${x} ${y - 10}Q${x} ${y} ${x + 10} ${y}Q${x} ${y} ${x} ${y + 10}Q${x} ${y} ${x - 10} ${y}Q${x} ${y} ${x} ${y - 10}Z"/>`)
    .join("")}</g>
</g></g>`;
  const defs = `<defs><path id="${id}m" class="mouthPath" d="${pose.mouth}" fill="${C.mouth}"/><clipPath id="${id}mc"><use href="#${id}m"/></clipPath>
<clipPath id="${id}eL"><ellipse cx="94" cy="120" rx="22.6" ry="25.6"/></clipPath><clipPath id="${id}eR"><ellipse cx="146" cy="120" rx="22.6" ry="25.6"/></clipPath>
${filters ? `<filter id="${id}b" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.6"/></filter><filter id="${id}s" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter><filter id="${id}d"><feColorMatrix class="dryM" type="saturate" values="${dry ? 0.3 : 1}"/></filter>` : ""}${P.defs()}</defs>`;
  return defs + parts;
}
