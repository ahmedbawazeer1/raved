/**
 * The learning companions (Hamza and Reem), drawn as SVG markup so they cost no image downloads.
 * Gradients and patterns come from <ArtDefs/> (rendered once in the student layout).
 * Only fixed, internal strings go into the markup: never user input.
 */
export type CompanionId = "hamza" | "reem";
export type Mood = "idle" | "happy" | "sad" | "think";
export type Headwear = "kufi" | "emama" | "none";

export const COMPANIONS: { id: CompanionId; name: string }[] = [
  { id: "hamza", name: "حمزة" },
  { id: "reem", name: "ريم" },
];

/** Reem's hijab colours (unlocked with stamps, see WARDROBE). */
export const HIJABS: Record<string, [string, string]> = {
  plum: ["#5B3A6E", "#4A2D5B"],
  teal: ["#0E6E5C", "#0A5446"],
  navy: ["#26355E", "#1B2747"],
  rose: ["#9C3D5A", "#7D2E47"],
};

export interface CompanionOptions {
  who?: CompanionId;
  mood?: Mood;
  /** Raised, waving arm. */
  wave?: boolean;
  /** Hamza's headwear (Reem always wears her hijab). */
  headwear?: Headwear;
  /** The older market seller used in scenes. */
  seller?: boolean;
  /** Reem's hijab colour (a key of HIJABS). */
  hijab?: string;
}

const BROWS: Record<Mood, string> = {
  idle: "M41 52 q7 -4 14 0 M65 52 q7 -4 14 0",
  happy: "M41 49 q7 -6 14 -1 M65 48 q7 -5 14 1",
  sad: "M42 51 q7 0 13 -4 M65 47 q6 4 13 4",
  think: "M41 52 q7 -3 14 0 M65 47 q7 -5 14 -1",
};

function eyes(mood: Mood): string {
  if (mood === "happy") {
    return '<path d="M42 66 q6 -8 12 0 M66 66 q6 -8 12 0" stroke="#2B1B12" stroke-width="3.4" fill="none" stroke-linecap="round"/>';
  }
  const dx = mood === "think" ? 2 : 0;
  const dy = mood === "think" ? -3 : 1;
  return `<g class="art-eyes"><ellipse cx="48" cy="65" rx="6.5" ry="7.5" fill="#fff"/><ellipse cx="72" cy="65" rx="6.5" ry="7.5" fill="#fff"/>
<circle cx="${48 + dx}" cy="${65 + dy}" r="4.6" fill="#4A2A18"/><circle cx="${72 + dx}" cy="${65 + dy}" r="4.6" fill="#4A2A18"/>
<circle cx="${48 + dx}" cy="${65 + dy}" r="2.2" fill="#0B0705"/><circle cx="${72 + dx}" cy="${65 + dy}" r="2.2" fill="#0B0705"/>
<circle cx="${49.6 + dx}" cy="${63 + dy}" r="1.5" fill="#fff"/><circle cx="${73.6 + dx}" cy="${63 + dy}" r="1.5" fill="#fff"/></g>`;
}

function mouth(mood: Mood, dy = 0): string {
  switch (mood) {
    case "happy":
      return `<path d="M47 ${81 + dy} Q60 ${100 + dy} 73 ${81 + dy}Z" fill="#6B2E1A"/><path d="M50 ${82 + dy} h20 v3 q-10 2.5 -20 0Z" fill="#fff"/><path d="M54 ${91 + dy} q6 4.5 12 0 q-6 -3.5 -12 0" fill="#E8747C"/>`;
    case "sad":
      return `<path d="M53 ${89 + dy} Q60 ${84 + dy} 67 ${89 + dy}" stroke="#6B2E1A" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    case "think":
      return `<ellipse class="art-mouth" cx="63" cy="${87 + dy}" rx="3.6" ry="4" fill="#6B2E1A"/>`;
    default:
      return `<path class="art-mouth" d="M52 ${84 + dy} Q60 ${92 + dy} 68 ${84 + dy} Q60 ${87 + dy} 52 ${84 + dy}Z" fill="#6B2E1A"/>`;
  }
}

const HEADWEAR: Record<Headwear, string> = {
  kufi: `<path d="M29 54 Q28 21 60 21 Q92 21 91 54 Q60 44 29 54Z" fill="#FBFBFB" stroke="#D5DCDA" stroke-width="1.5"/>
<path d="M31 49 Q60 40 89 49" stroke="#0E6E5C" stroke-width="3" fill="none"/><path d="M32 44 Q60 35 88 44" stroke="#F5A524" stroke-width="1.6" fill="none" stroke-dasharray="2.5 3"/>
<g fill="#0E6E5C" opacity=".8"><path d="M45 32 l3 3 -3 3 -3 -3Z"/><path d="M60 28 l3 3 -3 3 -3 -3Z"/><path d="M75 32 l3 3 -3 3 -3 -3Z"/></g>`,
  emama: `<path d="M86 48 q15 6 10 26 q-7 -10 -14 -17Z" fill="url(#art-emama)"/><path d="M25 56 Q22 20 60 17 Q98 20 95 56 Q60 42 25 56Z" fill="url(#art-emama)"/>
<path d="M28 46 Q60 30 92 46 M27 52 Q60 37 93 52 M32 36 Q60 22 88 36" stroke="rgba(0,0,0,.2)" stroke-width="2.6" fill="none"/>`,
  none: "",
};

function face(mood: Mood, skin: string, dark: string, browColor: string, mouthDy = 0, extra = ""): string {
  return `<ellipse cx="39" cy="78" rx="6" ry="3.5" fill="#F0846F" opacity=".4"/><ellipse cx="81" cy="78" rx="6" ry="3.5" fill="#F0846F" opacity=".4"/>
<path d="${BROWS[mood]}" stroke="${browColor}" stroke-width="3.2" fill="none" stroke-linecap="round"/>
${eyes(mood)}<path d="M60 69 q-3.5 8 0 10 q3 .5 4.5 -1" stroke="${dark}" stroke-width="2.2" fill="none" stroke-linecap="round"/>${extra}${mouth(mood, mouthDy)}`;
}

function hands(skin: string, wave: boolean, sleeve: string): string {
  return wave
    ? `<circle cx="30" cy="142" r="7.5" fill="${skin}"/><g class="art-wave"><path d="M86 118 Q103 104 104 86" stroke="${sleeve}" stroke-width="13" stroke-linecap="round" fill="none"/><circle cx="104" cy="81" r="8" fill="${skin}"/></g>`
    : `<circle cx="30" cy="142" r="7.5" fill="${skin}"/><circle cx="90" cy="142" r="7.5" fill="${skin}"/>`;
}

/** Inner SVG markup for a companion in a 120×160 viewBox. */
export function companionMarkup({
  who = "hamza",
  mood = "idle",
  wave = false,
  headwear = "kufi",
  seller = false,
  hijab = "plum",
}: CompanionOptions = {}): string {
  const shadow = '<ellipse cx="60" cy="156" rx="32" ry="5" fill="#000" opacity=".16"/>';
  if (who === "reem" && !seller) {
    const skin = "url(#art-skin-reem)";
    const [scarf, inner] = HIJABS[hijab] ?? HIJABS.plum;
    return `${shadow}
<path d="M26 160 C26 122 40 106 60 106 C80 106 94 122 94 160Z" fill="#0E6E5C"/>
<path d="M44 108 Q60 122 76 108 L80 160 H40Z" fill="#0A5446"/><path d="M46 126 Q60 134 74 126" stroke="#F5A524" stroke-width="2" fill="none" stroke-dasharray="3 3"/>
${hands(skin, wave, "#0E6E5C")}
<path d="M23 72 Q20 22 60 20 Q100 22 97 72 Q99 106 86 118 L34 118 Q21 106 23 72Z" fill="${scarf}"/>
<path d="M30 70 Q28 30 60 29 Q92 30 90 70" fill="${inner}"/>
<ellipse cx="60" cy="68" rx="25" ry="28" fill="${skin}"/>
<path d="M35 62 Q36 37 60 36 Q84 37 85 62 Q80 46 60 45 Q40 46 35 62Z" fill="${inner}"/>
${face(mood, skin, "#B5764A", "#3B2410")}
<path d="M36 90 Q60 112 84 90 L90 114 Q60 128 30 114Z" fill="${scarf}"/><circle cx="80" cy="104" r="3.2" fill="#F5A524" stroke="#fff" stroke-width="1"/>`;
  }
  const skin = seller ? "url(#art-skin-seller)" : "url(#art-skin-hamza)";
  const dark = seller ? "#8A5230" : "#B5764A";
  const body = seller
    ? `<path d="M24 160 C24 122 38 106 60 106 C82 106 96 122 96 160Z" fill="url(#art-thobe)" stroke="#D5DCDA" stroke-width="1.5"/><path d="M28 160 C28 126 38 112 51 108 L55 160Z M92 160 C92 126 82 112 69 108 L65 160Z" fill="#6B4226"/>`
    : `<path d="M26 160 C26 122 40 106 60 106 C80 106 94 122 94 160Z" fill="url(#art-thobe)" stroke="#D5DCDA" stroke-width="1.5"/>
<path d="M50 107 Q60 117 70 107" stroke="#C3CECB" stroke-width="2" fill="none"/><path d="M60 114 V146" stroke="#C3CECB" stroke-width="1.6"/><circle cx="60" cy="122" r="1.6" fill="#AFBDBA"/><circle cx="60" cy="131" r="1.6" fill="#AFBDBA"/>
<path d="M32 116 Q60 136 88 116 L92 127 Q60 151 28 127Z" fill="#0E6E5C"/><path d="M30 122 Q60 144 90 122" stroke="#F5A524" stroke-width="2" fill="none"/><path d="M84 124 l6 22 l-8 -2 l-2 -16Z" fill="#0A5446"/>`;
  const beard = seller
    ? '<path d="M33 74 Q34 108 60 110 Q86 108 87 74 Q81 93 60 95 Q39 93 33 74Z" fill="#EEF1F2"/><path d="M47 84 q13 -7 26 0 q-13 5 -26 0Z" fill="#EEF1F2"/>'
    : "";
  return `${shadow}<path d="M52 94 h16 v15 q-8 5 -16 0Z" fill="${dark}"/>${body}${hands(skin, wave, "#F1F4F3")}
<ellipse cx="30" cy="68" rx="6" ry="9" fill="${skin}"/><ellipse cx="90" cy="68" rx="6" ry="9" fill="${skin}"/>
<ellipse cx="60" cy="66" rx="30" ry="32" fill="${skin}"/>
<path d="M30 58 Q30 30 60 30 Q90 30 90 58 Q84 44 60 43 Q36 44 30 58Z" fill="${seller ? "#9AA3A6" : "#2B1B12"}"/>
${face(mood, skin, dark, seller ? "#D0D5D8" : "#2B1B12", seller ? 4 : 0, beard)}${HEADWEAR[seller ? "emama" : headwear]}`;
}
