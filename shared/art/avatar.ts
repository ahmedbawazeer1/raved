/**
 * The student's avatar: chosen face, skin, hair or hijab, colours, and items unlocked by real progress.
 * Full body with elbows and knees (classes .uaL/.faL/.legL/.shinL … are the animation hooks on the web).
 */
import { mix, paint } from "./paint";

export type FaceShape = "round" | "oval" | "square";
export type HairStyle = "short" | "curly" | "side" | "hijab" | "hijab2";
export type AvatarItem = "scarf" | "backpack" | "glasses" | "headphones" | "cap" | "medal" | "crown";
export type AvatarMouth = "smile" | "big" | "sad" | "flat" | "O" | "grin" | "wow" | "E";

export interface AvatarConfig {
  face: FaceShape;
  skin: string;
  hair: HairStyle;
  hairColor: string;
  top: string;
  items: AvatarItem[];
}

export const SKINS = ["#F6D3B3", "#E9BC96", "#C68C62", "#8D5B3D", "#5E3A26"];
export const HAIR_COLORS = ["#2B1B12", "#5A3A22", "#9A6A3A", "#0E6E5C", "#7A52D6", "#2E9BD6", "#B42318", "#E9CF98"];
export const TOPS = ["#2E9BD6", "#F5A524", "#22B38A", "#7A52D6", "#E0442F", "#26344F"];
export const HAIR_STYLES: { key: HairStyle; label: string }[] = [
  { key: "short", label: "قصير" },
  { key: "curly", label: "مجعّد" },
  { key: "side", label: "جانبي" },
  { key: "hijab", label: "حجاب" },
  { key: "hijab2", label: "حجاب ملفوف" },
];
export const FACES: { key: FaceShape; label: string }[] = [
  { key: "round", label: "مستدير" },
  { key: "oval", label: "بيضوي" },
  { key: "square", label: "عريض" },
];

/** What the student has achieved; items unlock from it (never bought). */
export interface AvatarProgress {
  unitsPassed: number;
  levelsDone: number;
  gamesWon: number;
  bestWatering: number;
  champion: boolean;
  pathDone: boolean;
}

export const AVATAR_ITEMS: { key: AvatarItem; label: string; rule: string; unlocked: (p: AvatarProgress) => boolean }[] = [
  { key: "glasses", label: "نظارة", rule: "متاحة من البداية", unlocked: () => true },
  { key: "scarf", label: "وشاح", rule: "إتمام أول وحدة", unlocked: (p) => p.unitsPassed >= 1 },
  { key: "cap", label: "قبعة / دبوس", rule: "سقاية ٧ أيام متتالية", unlocked: (p) => p.bestWatering >= 7 },
  { key: "headphones", label: "سماعات", rule: "الفوز في ٥ ألعاب", unlocked: (p) => p.gamesWon >= 5 },
  { key: "backpack", label: "حقيبة", rule: "إتمام المستوى الأول", unlocked: (p) => p.levelsDone >= 1 },
  { key: "medal", label: "ميدالية", rule: "أحد أبطال الشهر", unlocked: (p) => p.champion },
  { key: "crown", label: "إكليل أوراق", rule: "إتمام المسار", unlocked: (p) => p.pathDone },
];

export const DEFAULT_AVATAR: AvatarConfig = { face: "round", skin: "#C68C62", hair: "short", hairColor: "#2B1B12", top: "#2E9BD6", items: [] };

/** Keep only valid values (the config comes from storage). */
export function parseAvatar(raw: unknown): AvatarConfig {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<Record<keyof AvatarConfig, unknown>>;
  const hex = (v: unknown, list: string[], d: string) => (typeof v === "string" && list.includes(v) ? v : d);
  const items = Array.isArray(r.items) ? (r.items.filter((i) => AVATAR_ITEMS.some((x) => x.key === i)) as AvatarItem[]) : [];
  return {
    face: FACES.some((f) => f.key === r.face) ? (r.face as FaceShape) : DEFAULT_AVATAR.face,
    skin: hex(r.skin, SKINS, DEFAULT_AVATAR.skin),
    hair: HAIR_STYLES.some((h) => h.key === r.hair) ? (r.hair as HairStyle) : DEFAULT_AVATAR.hair,
    hairColor: hex(r.hairColor, HAIR_COLORS, DEFAULT_AVATAR.hairColor),
    top: hex(r.top, TOPS, DEFAULT_AVATAR.top),
    items: [...new Set(items)],
  };
}

/** Items the student may wear now. */
export function wearableItems(cfg: AvatarConfig, progress: AvatarProgress): AvatarItem[] {
  return cfg.items.filter((k) => AVATAR_ITEMS.find((i) => i.key === k)?.unlocked(progress));
}

export const AVATAR_VIEWBOX = "0 0 180 300";
export const AVATAR_MOUTHS: Record<AvatarMouth, string> = {
  smile: "M82 110 Q90 112 98 110 Q90 119 82 110 Z",
  big: "M79 108 Q90 111 101 108 Q90 127 79 108 Z",
  sad: "M83 116 Q90 110 97 116 Q90 114 83 116 Z",
  flat: "M84 113 Q90 113 96 113 Q90 114.5 84 113 Z",
  O: "M85 110 Q90 104 95 110 Q90 120 85 110 Z",
  grin: "M81 112 Q91 113 100 106 Q93 121 81 112 Z",
  wow: "M84 108 Q90 99 96 108 Q90 124 84 108 Z",
  E: "M80 109 Q90 111 100 109 Q90 116 80 109 Z",
};

const FACE: Record<FaceShape, number[]> = { round: [52, 38, 76, 86, 38], oval: [55, 34, 70, 92, 35], square: [52, 40, 76, 82, 24] };
const FACE_H: Record<FaceShape, number[]> = { round: [58, 46, 64, 78, 32], oval: [60, 42, 60, 84, 30], square: [58, 48, 64, 74, 22] };
const INK = "#0F1F1B";

type P = ReturnType<typeof paint>;
function hairBack(c: AvatarConfig, P: P) {
  return c.hair.startsWith("hijab")
    ? `<g class="hjb"><path d="M40 92 C40 44 62 24 90 24 C118 24 140 44 140 92 L144 156 C144 166 126 172 90 172 C54 172 36 166 36 156 Z" fill="${P.rg(c.hairColor, 0.3, -0.3)}"/></g>`
    : "";
}
function hairFront(c: AvatarConfig, P: P) {
  const f = P.rg(c.hairColor, 0.35, -0.3),
    hl = mix(c.hairColor, 0.35);
  switch (c.hair) {
    case "short":
      return `<path d="M47 80 C41 38 66 20 92 20 C120 20 140 38 133 78 C127 62 117 54 105 56 C95 46 73 48 63 62 C57 68 52 74 47 80Z" fill="${f}"/><path d="M72 28 C82 23 98 23 108 26 C98 28 84 30 72 36Z" fill="${hl}" opacity=".7"/>`;
    case "curly":
      return (
        [
          [60, 50, 15],
          [76, 36, 16],
          [95, 32, 17],
          [113, 38, 16],
          [126, 54, 14],
          [52, 68, 11],
          [130, 72, 11],
        ]
          .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${f}"/>`)
          .join("") + `<circle cx="88" cy="26" r="5" fill="${hl}" opacity=".7"/>`
      );
    case "side":
      return `<path d="M48 80 C44 36 72 20 96 22 C122 24 138 42 132 78 C126 54 104 44 84 50 C72 54 58 66 48 80Z" fill="${f}"/><path d="M84 50 C96 40 118 42 128 56 C112 50 98 50 84 58Z" fill="${mix(c.hairColor, -0.15)}"/><path d="M80 28 C90 24 104 25 112 30 C102 30 92 31 80 36Z" fill="${hl}" opacity=".7"/>`;
    case "hijab":
      return `<path d="M50 86 C50 50 68 36 90 36 C112 36 130 50 130 86 C124 60 108 48 90 48 C72 48 56 60 50 86Z" fill="${mix(c.hairColor, -0.22)}"/><path d="M58 40 C68 32 80 30 90 30 C80 34 68 38 62 46Z" fill="${mix(c.hairColor, 0.35)}" opacity=".8"/><circle cx="127" cy="130" r="4.5" fill="${P.rg("#F5A524")}"/>`;
    case "hijab2":
      return `<path d="M50 86 C50 50 68 36 90 36 C112 36 130 50 130 86 C124 60 108 48 90 48 C72 48 56 60 50 86Z" fill="${mix(c.hairColor, -0.22)}"/><path d="M130 118 C118 152 78 166 52 156 C74 180 124 176 140 144Z" fill="${P.rg(mix(c.hairColor, -0.1), 0.3, -0.3)}"/><path d="M68 162 C90 166 112 156 126 140" stroke="${mix(c.hairColor, -0.3)}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
  }
}
function items(c: AvatarConfig, where: "back" | "torso" | "head", P: P) {
  const has = (k: AvatarItem) => c.items.includes(k),
    hij = c.hair.startsWith("hijab");
  let s = "";
  if (where === "back" && has("backpack")) s += `<rect x="38" y="138" width="104" height="74" rx="24" fill="${P.rg("#E0442F", 0.3, -0.3)}"/>`;
  if (where === "torso") {
    if (has("backpack"))
      s += `<path d="M64 128 L70 210" stroke="#B5301E" stroke-width="7" stroke-linecap="round"/><path d="M116 128 L110 210" stroke="#B5301E" stroke-width="7" stroke-linecap="round"/>`;
    if (has("scarf"))
      s += `<path d="M64 124 C76 134 104 134 116 124 L118 136 C104 146 76 146 62 136Z" fill="${P.rg("#F5A524", 0.35, -0.3)}"/><path d="M104 138 l6 24 l-12 -2 z" fill="${mix("#F5A524", -0.15)}"/>`;
    if (has("medal"))
      s += `<path d="M106 150 l6 14 l6 -14z" fill="#2E9BD6"/><circle cx="112" cy="170" r="9" fill="${P.rg("#F5A524", 0.45, -0.3)}"/><path d="M112 165l1.6 3.4 3.7.5-2.7 2.6.7 3.7-3.3-1.8-3.3 1.8.7-3.7-2.7-2.6 3.7-.5z" fill="#fff"/>`;
  }
  if (where === "head") {
    if (has("glasses"))
      s += `<g fill="rgba(255,255,255,.18)" stroke="#1F2A44" stroke-width="3"><circle cx="76" cy="90" r="11"/><circle cx="104" cy="90" r="11"/></g><path d="M87 90 h6" stroke="#1F2A44" stroke-width="3"/>`;
    if (has("cap"))
      s += hij
        ? `<g transform="translate(118 64)"><circle r="8" fill="${P.rg("#FF8FB1", 0.4, -0.2)}"/><circle r="3" fill="#F5A524"/></g>`
        : `<path d="M48 62 C48 26 132 26 132 62 Z" fill="${P.rg("#22B38A", 0.35, -0.3)}"/><path d="M90 58 h52 a6 6 0 0 1 0 11 h-52Z" fill="#13876A"/><circle cx="90" cy="30" r="4" fill="#F5A524"/>`;
    if (has("headphones"))
      s += `<path d="M42 88 a48 48 0 0 1 96 0" stroke="#1F2A44" stroke-width="6" fill="none"/><rect x="34" y="78" width="15" height="26" rx="7" fill="${P.rg("#2E9BD6")}"/><rect x="131" y="78" width="15" height="26" rx="7" fill="${P.rg("#2E9BD6")}"/>`;
    if (has("crown"))
      s += [-60, -35, -10, 15, 40, 65]
        .map(
          (a, i) =>
            `<path d="M0 0 C-4 -10 4 -18 10 -14 C8 -6 4 -2 0 0Z" fill="${P.rg(i % 2 ? "#22B38A" : "#F5A524", 0.4, -0.25)}" transform="translate(${(90 + 44 * Math.sin((a * Math.PI) / 180)).toFixed(1)} ${(62 - 40 * Math.cos((a * Math.PI) / 180)).toFixed(1)}) rotate(${a})"/>`,
        )
        .join("");
  }
  return s;
}

export interface AvatarOptions {
  id?: string;
  mouth?: AvatarMouth;
  filters?: boolean;
  /** Right arm raised (waving). */
  wave?: boolean;
}

/** Full-body avatar inner markup for viewBox AVATAR_VIEWBOX. */
export function avatarMarkup(cfg: AvatarConfig, { id = "av", mouth = "smile", filters = true, wave = false }: AvatarOptions = {}): string {
  const c = parseAvatar(cfg),
    P = paint(id),
    hij = c.hair.startsWith("hijab");
  const [fx, fy, fw, fh, fr] = (hij ? FACE_H : FACE)[c.face];
  const skin = P.rg(c.skin, 0.38, -0.18),
    skinS = mix(c.skin, -0.18),
    top = P.rg(c.top, 0.35, -0.3),
    topS = mix(c.top, -0.25);
  const brow = hij ? "#5B3A28" : mix(c.hairColor, -0.1);
  const pants = P.lg("#26344F", 0.2, -0.2),
    shoe = P.rg("#FFFFFF", 0, -0.12);
  const leg = (x: number, cls: string, ox: number) =>
    `<g class="leg${cls}"><rect x="${x}" y="204" width="20" height="40" rx="9" fill="${pants}"/><g class="shin${cls}"><rect x="${x}" y="236" width="20" height="36" rx="9" fill="${pants}"/><rect x="${x + ox}" y="262" width="32" height="18" rx="9" fill="${shoe}"/><rect x="${x + ox}" y="274" width="32" height="6" rx="3" fill="#C9D3E0"/></g></g>`;
  const armL = `<g class="uaL"><path d="M48 132 C40 142 39 156 41 170 L59 170 C59 156 60 144 63 136 Z" fill="${top}"/><g class="faL"><rect x="41" y="164" width="18" height="30" rx="9" fill="${top}"/><rect x="41" y="188" width="18" height="8" rx="4" fill="${topS}"/><circle cx="50" cy="203" r="9.5" fill="${skin}"/></g></g>`;
  const armR = `<g class="uaR"${wave ? ` transform="rotate(-150 124 136)"` : ""}><path d="M132 132 C140 142 141 156 139 170 L121 170 C121 156 120 144 117 136 Z" fill="${top}"/><g class="faR"${wave ? ` transform="rotate(-20 130 168)"` : ""}><rect x="121" y="164" width="18" height="30" rx="9" fill="${top}"/><rect x="121" y="188" width="18" height="8" rx="4" fill="${topS}"/><circle cx="130" cy="203" r="9.5" fill="${skin}"/></g></g>`;
  const body = `
<ellipse class="shadow" cx="90" cy="290" rx="50" ry="8" fill="#06261E" opacity=".2"${filters ? ` filter="url(#${id}s)"` : ""}/>
<g class="all">${leg(69, "L", -9)}${leg(91, "R", -3)}${items(c, "back", P)}
<g class="torso"><path d="M48 158 C48 134 66 122 90 122 C114 122 132 134 132 158 L134 210 C134 218 128 222 120 222 L60 222 C52 222 46 218 46 210 Z" fill="${top}"/>
<path d="M68 190 h44 v14 a6 6 0 0 1 -6 6 h-32 a6 6 0 0 1 -6 -6z" fill="${topS}" opacity=".5"/><path d="M66 126 C72 140 108 140 114 126 C108 148 72 148 66 126Z" fill="${topS}"/>
<path d="M90 146 v58" stroke="${topS}" stroke-width="2.5" opacity=".6"/><path d="M56 140 C58 134 62 131 66 131" stroke="#fff" stroke-width="3" opacity=".35" fill="none" stroke-linecap="round"/>${items(c, "torso", P)}</g>
<g class="head">${hairBack(c, P)}
${hij ? "" : `<rect x="82" y="108" width="16" height="22" fill="${skinS}"/><ellipse cx="${fx}" cy="86" rx="8" ry="10" fill="${skin}"/><ellipse cx="${fx + fw}" cy="86" rx="8" ry="10" fill="${skinS}"/>`}
<rect x="${fx}" y="${fy}" width="${fw}" height="${fh}" rx="${fr}" fill="${skin}"/>
<path d="M${fx + fw} ${fy + fh * 0.45} C${fx + fw} ${fy + fh * 0.85} ${fx + fw * 0.75} ${fy + fh} ${fx + fw / 2} ${fy + fh} C${fx + fw * 0.72} ${fy + fh * 0.92} ${fx + fw - 6} ${fy + fh * 0.75} ${fx + fw - 4} ${fy + fh * 0.45}Z" fill="${skinS}" opacity=".45"/>
${hairFront(c, P)}
<ellipse cx="68" cy="106" rx="7" ry="4.5" fill="#FF8F7A" opacity=".5"/><ellipse cx="112" cy="106" rx="7" ry="4.5" fill="#FF8F7A" opacity=".5"/>
<g class="eyes"><ellipse cx="76" cy="90" rx="8.5" ry="10" fill="#fff"/><ellipse cx="104" cy="90" rx="8.5" ry="10" fill="#fff"/>
<g class="kp"><circle cx="77" cy="91.5" r="6" fill="${INK}"/><circle cx="105" cy="91.5" r="6" fill="${INK}"/><circle cx="79.4" cy="88.6" r="2.2" fill="#fff"/><circle cx="107.4" cy="88.6" r="2.2" fill="#fff"/></g>
${hij ? `<path d="M67 84 l-5 -4 M113 84 l5 -4" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>` : ""}</g>
<rect class="kbL" x="67" y="73" width="17" height="5" rx="2.5" fill="${brow}"/><rect class="kbR" x="96" y="73" width="17" height="5" rx="2.5" fill="${brow}"/>
<path d="M88 97 C87 103 92 104 94 102" stroke="${skinS}" stroke-width="3" fill="none" stroke-linecap="round"/>
<use href="#${id}m"/>${items(c, "head", P)}</g>
${armL}${armR}
<g class="kfx" opacity="0"><circle cx="134" cy="52" r="5" fill="#C9D6D1"/><circle cx="148" cy="36" r="8" fill="#C9D6D1"/><circle cx="166" cy="14" r="12" fill="#C9D6D1"/></g>
</g>`;
  return `<defs><path id="${id}m" class="kmouth" d="${AVATAR_MOUTHS[mouth]}" fill="#5E160D"/>${filters ? `<filter id="${id}s" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter>` : ""}${P.defs()}</defs>${body}`;
}

/** Just the head (for small places: league rows, the boat on the map). viewBox "36 14 108 120". */
export const AVATAR_HEAD_VIEWBOX = "36 14 108 124";
