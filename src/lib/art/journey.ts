/**
 * Layout and scenery of the «رحلة حضرموت» map (unit tested). The map is a tall SVG, 390 wide:
 * the journey starts on the coast at the bottom (sea, Mukalla's white houses), climbs the Jol
 * plateau and ends in Wadi Hadramout at the top. Any number of units fits: the map grows.
 */
export const MAP_WIDTH = 390;
const TOP = 240;
const BOTTOM = 300;
const STEP = 118;
const XS = [195, 105, 270, 150, 275, 112, 235, 98, 262];

export interface Point {
  x: number;
  y: number;
}

export interface JourneyLayout {
  height: number;
  stops: Point[];
  /** y where the valley ends and the plateau starts. */
  valleyEnd: number;
  /** y where the plateau ends and the coast starts. */
  coastTop: number;
  seaTop: number;
}

export function journeyLayout(count: number): JourneyLayout {
  const n = Math.max(1, count);
  const height = TOP + (n - 1) * STEP + BOTTOM;
  const stops = Array.from({ length: n }, (_, i) => ({
    x: XS[i % XS.length],
    y: height - 210 - i * STEP,
  }));
  return {
    height,
    stops,
    valleyEnd: Math.round(height * 0.45),
    coastTop: Math.round(height * 0.72),
    seaTop: height - 110,
  };
}

/** Road through the stops (smooth S-curves), up to stop `upTo` (inclusive). */
export function roadPath(stops: Point[], upTo = stops.length - 1): string {
  if (stops.length === 0) return "";
  let d = `M${stops[0].x} ${stops[0].y}`;
  for (let i = 1; i <= Math.min(upTo, stops.length - 1); i++) {
    const a = stops[i - 1];
    const b = stops[i];
    const m = (a.y + b.y) / 2;
    d += ` C${a.x} ${m} ${b.x} ${m} ${b.x} ${b.y}`;
  }
  return d;
}

/** Illustrated icon for a stop, from the place name (falls back to general icons). */
const PLACE_ICONS: [RegExp, string][] = [
  [/ميناء|بحر|بروم|روكب/, "boat"],
  [/المكلا|الريان/, "dome"],
  [/الشحر|الحامي|صيد/, "fish"],
  [/شرمة|سلحف/, "turtle"],
  [/الديس|نخل/, "palm"],
  [/غيل|عين|ماء/, "drop"],
  [/دوعن|عسل/, "honey"],
  [/شبام/, "towers"],
  [/سيئون|قصر/, "fort"],
  [/تريم|مسجد|مئذنة/, "minaret"],
  [/جول|جبل|القطن|فوّة|فوة/, "mountain"],
];
const FALLBACK = ["palm", "mountain", "boat", "star", "drop"];

export function stopIcon(name: string | null | undefined, index: number): string {
  const hit = name ? PLACE_ICONS.find(([re]) => re.test(name)) : undefined;
  return `art-i-${hit ? hit[1] : FALLBACK[index % FALLBACK.length]}`;
}

export interface Landmark {
  key: string;
  en: string;
  ar: string;
  fact: string;
  x: number;
  y: number;
  /** Tap radius. */
  r: number;
  markup: string;
}

const LANDMARK_FACTS: Record<string, { en: string; ar: string; fact: string }> = {
  boat: {
    en: "Boat",
    ar: "قارب",
    fact: "السنبوق قارب خشبي يصنعه الحضارم في المكلا منذ مئات السنين.",
  },
  houses: {
    en: "House",
    ar: "بيت",
    fact: "بيوت المكلا البيضاء مصفوفة بين الجبل والبحر.",
  },
  gull: {
    en: "Bird",
    ar: "طائر",
    fact: "طيور النورس تحوم فوق الساحل بحثاً عن السمك.",
  },
  turtle: {
    en: "Turtle",
    ar: "سلحفاة",
    fact: "في شاطئ شرمة تخرج السلاحف الخضراء لتضع بيضها.",
  },
  bee: {
    en: "Bee",
    ar: "نحلة",
    fact: "نحل دوعن يصنع عسل السدر المشهور في العالم.",
  },
  tower: {
    en: "Tower",
    ar: "برج",
    fact: "بيوت شبام الطينية عالية جداً، وتُسمّى «ناطحات سحاب الصحراء».",
  },
  minaret: {
    en: "Minaret",
    ar: "مئذنة",
    fact: "مئذنة المحضار في تريم من أعلى المآذن الطينية في العالم.",
  },
};

/** Tappable landmarks that teach a word. Valley landmarks appear only when the map is tall enough. */
export function landmarks(l: JourneyLayout): Landmark[] {
  const h = l.height;
  const list: Omit<Landmark, "en" | "ar" | "fact">[] = [
    {
      key: "boat",
      x: 318,
      y: h - 46,
      r: 40,
      markup: `<g class="art-rock"><path d="M-34 4 H34 Q30 20 18 22 H-22 Q-32 18 -34 4Z" fill="url(#art-wood)"/><path d="M-34 4 H34" stroke="#F5A524" stroke-width="2.5"/><path d="M-2 4 V-46" stroke="#5A3416" stroke-width="2.5"/><path d="M-2 -44 Q26 -26 22 0 H-2Z" fill="#FFF8E6"/><path d="M-2 -40 Q-22 -22 -18 0 H-2Z" fill="#F1E3C4"/><path d="M-2 -46 l12 3 l-12 4Z" fill="#E03131"/></g>`,
    },
    {
      key: "houses",
      x: 66,
      y: h - 150,
      r: 56,
      markup: `<g filter="url(#art-shadow)">${[
        [-62, 18, 24, 40],
        [-40, 6, 22, 52],
        [-20, 22, 26, 36],
        [4, 12, 20, 46],
        [22, 28, 24, 30],
        [-52, -14, 18, 30],
        [-10, -14, 20, 34],
      ]
        .map(
          ([x, y, w, ht]) =>
            `<rect x="${x}" y="${y}" width="${w}" height="${ht}" fill="#fff"/><rect x="${x}" y="${y}" width="${w}" height="3" fill="#E9D3A8"/><rect x="${x + 5}" y="${y + 9}" width="4" height="6" rx="1" fill="#7FA9A1"/><rect x="${x + w - 9}" y="${y + 9}" width="4" height="6" rx="1" fill="#7FA9A1"/>`,
        )
        .join("")}<rect x="48" y="-22" width="7" height="80" fill="#fff"/><path d="M47 -22 L51.5 -34 L56 -22Z" fill="#0E6E5C"/></g>`,
    },
    {
      key: "turtle",
      x: 352,
      y: l.coastTop + 70,
      r: 26,
      markup: '<use href="#art-i-turtle" x="-16" y="-16" width="32" height="32"/>',
    },
    {
      key: "gull",
      x: 46,
      y: l.coastTop + 30,
      r: 26,
      markup:
        '<g class="art-fly"><path class="art-flap" d="M-14 0 q7 -9 14 0 q7 -9 14 0" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/><path class="art-flap" d="M8 14 q5 -6 10 0 q5 -6 10 0" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round"/></g>',
    },
    {
      key: "bee",
      x: 38,
      y: Math.round((l.valleyEnd + l.coastTop) / 2),
      r: 32,
      markup:
        '<g transform="translate(-26 -40)"><path d="M26 64 Q24 44 28 28" stroke="#6B421E" stroke-width="4" fill="none"/><ellipse cx="26" cy="22" rx="24" ry="15" fill="#5C8A3A"/><ellipse cx="18" cy="18" rx="12" ry="8" fill="#74A84B"/><path d="M38 36 q8 0 8 8 v6 q0 6 -8 6 q-8 0 -8 -6 v-6 q0 -8 8 -8Z" fill="#C98B4A"/><path d="M31 44 h14 M31 50 h14" stroke="#9C6532" stroke-width="1.4"/><g class="art-buzz"><g transform="translate(50 26)"><ellipse rx="4" ry="3" fill="#FFD43B"/><path d="M-1.5 -3 v6 M1.5 -3 v6" stroke="#222" stroke-width="1.2"/><ellipse class="art-flap" cx="0" cy="-4" rx="3" ry="2" fill="#fff" opacity=".85"/></g></g></g>',
    },
  ];
  if (l.valleyEnd - TOP > 140) {
    list.push({
      key: "tower",
      x: 346,
      y: l.valleyEnd - 30,
      r: 40,
      markup: `<g transform="translate(-34 -78)" filter="url(#art-shadow)">${[
        [0, 30, 44],
        [14, 14, 60],
        [30, 22, 52],
        [46, 34, 40],
      ]
        .map(
          ([x, y, ht], i) =>
            `<rect x="${x}" y="${y}" width="${i % 2 ? 16 : 14}" height="${ht + 20}" fill="${i % 2 ? "#E2B985" : "#D3A46C"}"/><rect x="${x}" y="${y}" width="${i % 2 ? 16 : 14}" height="3" fill="#fff"/>` +
            [0, 1, 2, 3]
              .map(
                (k) =>
                  `<rect x="${x + 4}" y="${y + 9 + k * 13}" width="3" height="4" fill="#7A4E2A"/><rect x="${x + 9}" y="${y + 9 + k * 13}" width="3" height="4" fill="#7A4E2A"/>`,
              )
              .join(""),
        )
        .join("")}<rect x="-4" y="92" width="70" height="6" rx="2" fill="#B9895A"/></g>`,
    });
    list.push({
      key: "minaret",
      x: 40,
      y: TOP + 10,
      r: 34,
      markup:
        '<g transform="translate(-26 -74)" filter="url(#art-shadow)"><rect x="0" y="66" width="52" height="16" fill="#EBD3A6"/><path d="M2 66 q5 -7 10 0 M14 66 q5 -7 10 0 M28 66 q5 -7 10 0 M40 66 q5 -7 10 0" stroke="#C9A57A" stroke-width="1.6" fill="none"/><path d="M20 82 L23 8 L29 8 L32 82Z" fill="#FAFAFA" stroke="#C9D2D0"/><path d="M21.5 24 h9 M21 40 h10 M20.5 56 h11" stroke="#D9B07A" stroke-width="2"/><rect x="20" y="10" width="12" height="3" rx="1" fill="#D9B07A"/><path d="M22.5 8 L26 0 L29.5 8Z" fill="#F5A524"/></g>',
    });
  }
  return list.map((m) => ({ ...m, ...LANDMARK_FACTS[m.key] }));
}

/** The static background: sky, valley walls, plateau, coast and sea. */
export function sceneryMarkup(l: JourneyLayout): string {
  const h = l.height;
  const v = l.valleyEnd;
  const c = l.coastTop;
  let s = `<rect width="390" height="${h}" fill="#EBD9AF"/>`;
  // plateau and coast bands
  s += `<path d="M0 ${v - 20} Q100 ${v - 50} 195 ${v - 18} T390 ${v - 30} V${c + 10} H0Z" fill="#E0BE8A"/>`;
  s += `<path d="M0 ${v + 60} Q120 ${v + 30} 220 ${v + 70} T390 ${v + 55} V${c} H0Z" fill="#C9985F" opacity=".55"/>`;
  s += `<path d="M0 ${c} Q100 ${c - 30} 195 ${c} T390 ${c - 14} V${h} H0Z" fill="#F5E6C4"/>`;
  // sky, sun, clouds, far mountains
  s += `<rect width="390" height="240" fill="url(#art-sky)"/><circle cx="305" cy="78" r="70" fill="url(#art-sun)"/><circle cx="305" cy="78" r="22" fill="#FFE8A3"/>`;
  s += `<g class="art-drift"><g transform="translate(40 70)"><ellipse rx="30" ry="9" fill="#fff" opacity=".7"/><ellipse cx="14" cy="-6" rx="16" ry="9" fill="#fff" opacity=".7"/></g><g transform="translate(180 120)"><ellipse rx="24" ry="7" fill="#fff" opacity=".5"/></g></g>`;
  s += `<path d="M0 205 L36 176 L70 196 L118 160 L168 200 L220 168 L262 194 L318 158 L360 186 L390 172 V250 H0Z" fill="#D9B58A" opacity=".8"/>`;
  // valley walls (jagged, flat-topped cliffs) down to the plateau
  const wall = (side: "l" | "r") => {
    const pts: string[] = [];
    for (let y = 214, k = 0; y < v; y += 60, k++) pts.push(`${[56, 50, 64, 52, 66][k % 5]} ${y}`);
    const mirror = (p: string) => {
      const [x, y] = p.split(" ").map(Number);
      return side === "l" ? `${x} ${y}` : `${390 - x} ${y}`;
    };
    const edge = side === "l" ? 0 : 390;
    return `<path d="M${edge} 214 L${pts.map(mirror).join(" L")} L${side === "l" ? 40 : 350} ${v} L${edge} ${v + 10}Z" fill="url(#art-cliff-${side})"/>`;
  };
  if (v > 260) s += wall("l") + wall("r");
  // fields and palm groves in the valley
  for (let y = 290, k = 0; y < v - 40; y += 110, k++) {
    const x = k % 2 ? 300 : 84;
    s += `<ellipse cx="${x}" cy="${y}" rx="36" ry="16" fill="#9BC77B" opacity=".85"/><use href="#art-i-palm" x="${x - 26}" y="${y - 30}" width="28" height="30"/><use href="#art-i-palm" x="${x - 4}" y="${y - 26}" width="26" height="28"/>`;
  }
  // plateau mesas and rocks
  for (let y = v + 90, k = 0; y < c - 30; y += 150, k++) {
    s +=
      k % 2
        ? `<path d="M262 ${y} L278 ${y - 32} H352 L372 ${y}Z" fill="url(#art-mesa)" opacity=".9"/>`
        : `<path d="M14 ${y} L32 ${y - 36} H96 L114 ${y}Z" fill="url(#art-mesa)"/>`;
    s += `<ellipse cx="${k % 2 ? 60 : 330}" cy="${y + 40}" rx="7" ry="4" fill="#A8703F" opacity=".55"/>`;
  }
  // Mukalla mountain behind the houses
  s += `<path d="M0 ${h - 232} Q30 ${h - 290} 70 ${h - 260} Q100 ${h - 300} 140 ${h - 246} Q160 ${h - 230} 170 ${h - 190} V${h - 80} H0Z" fill="#A8703F" opacity=".9"/>`;
  // sea and waves
  const t = l.seaTop;
  s += `<path d="M0 ${t} Q100 ${t - 22} 200 ${t + 4} T390 ${t - 8} V${h} H0Z" fill="url(#art-sea)"/><path d="M0 ${t} Q100 ${t - 22} 200 ${t + 4} T390 ${t - 8}" stroke="#fff" stroke-width="3" fill="none" opacity=".7"/>`;
  s += `<g class="art-sea-waves">${Array.from({ length: 10 }, (_, i) => `<path d="M${i * 56} ${t + 36} q14 -7 28 0 t28 0" stroke="#fff" stroke-width="2.2" fill="none" opacity=".45"/><path d="M${i * 56 + 20} ${t + 62} q14 -6 28 0" stroke="#fff" stroke-width="2" fill="none" opacity=".3"/>`).join("")}</g>`;
  return s;
}
