/**
 * The guardians of the journey stops (the unit quiz is a battle against one), drawn as SVG markup
 * in a 160×170 viewBox. Each stop gets one, chosen from its place name or its position.
 * Gradients come from <ArtDefs/>. Fixed internal strings only.
 */
export interface Guardian {
  id: "leopard" | "ibex" | "falcon";
  name: string;
}

export const GUARDIANS: Guardian[] = [
  { id: "leopard", name: "نمر الجول" },
  { id: "ibex", name: "وعل حضرموت" },
  { id: "falcon", name: "صقر الوادي" },
];

export function guardianFor(stop: string | null | undefined, position: number): Guardian {
  if (stop && /شبام|سيئون|تريم|الوادي|القطن/.test(stop)) return GUARDIANS[2];
  if (stop && /دوعن|جول|غيل|جبل/.test(stop)) return GUARDIANS[1];
  return GUARDIANS[(Math.max(1, position) - 1) % GUARDIANS.length];
}

const KO_EYES = '<path d="M48 58 l14 12 M62 58 l-14 12 M98 58 l14 12 M112 58 l-14 12" stroke="#3B2410" stroke-width="4" stroke-linecap="round"/>';

function leopard(ko: boolean): string {
  const eyes = ko
    ? KO_EYES
    : `<path d="M44 66 Q56 53 68 64 Q56 74 44 66Z" fill="#D4F53C"/><path d="M116 66 Q104 53 92 64 Q104 74 116 66Z" fill="#D4F53C"/>
<ellipse cx="57" cy="65" rx="2.2" ry="6" fill="#111"/><ellipse cx="103" cy="65" rx="2.2" ry="6" fill="#111"/>
<path d="M41 55 L68 61 M119 55 L92 61" stroke="#3B2410" stroke-width="4.5" stroke-linecap="round"/>`;
  const spots = [
    [46, 46],
    [62, 36],
    [98, 36],
    [114, 46],
    [34, 78],
    [126, 78],
    [44, 102],
    [116, 102],
    [80, 30],
  ]
    .map(
      ([x, y]) => `<circle cx="${x}" cy="${y}" r="4.6" fill="none" stroke="#5A3416" stroke-width="2.2"/><circle cx="${x}" cy="${y}" r="1.4" fill="#A0601F"/>`,
    )
    .join("");
  return `<ellipse cx="80" cy="164" rx="56" ry="7" fill="#000" opacity=".35"/>
<path d="M18 170 Q22 116 80 114 Q138 116 142 170Z" fill="url(#art-leo)"/>
<path d="M56 170 Q60 132 80 128 Q100 132 104 170Z" fill="#FFF1D6"/>
<path d="M38 130 Q80 150 122 130 L124 141 Q80 163 36 141Z" fill="url(#art-gold)" stroke="#9C5E00"/><circle cx="80" cy="149" r="6.5" fill="#0E6E5C" stroke="#FFE38F" stroke-width="2"/>
<path d="M32 54 L28 12 L68 34Z" fill="url(#art-leo)"/><path d="M38 46 L36 22 L60 36Z" fill="#5A3416"/>
<path d="M128 54 L132 12 L92 34Z" fill="url(#art-leo)"/><path d="M122 46 L124 22 L100 36Z" fill="#5A3416"/>
<path d="M22 72 Q22 25 80 25 Q138 25 138 72 Q138 114 80 121 Q22 114 22 72Z" fill="url(#art-leo)"/>${spots}
<ellipse cx="66" cy="95" rx="17" ry="13" fill="#FFF1D6"/><ellipse cx="94" cy="95" rx="17" ry="13" fill="#FFF1D6"/><ellipse cx="80" cy="108" rx="12" ry="8" fill="#FFF1D6"/>
<path d="M70 83 Q80 77 90 83 Q86 93 80 95 Q74 93 70 83Z" fill="#6E3434"/>
<path d="M80 95 V101 M80 101 Q72 107 63 102 M80 101 Q88 107 97 102" stroke="#5A3416" stroke-width="2.4" fill="none" stroke-linecap="round"/>
<path d="M71 103 l3 8 l3 -6.5Z M89 103 l-3 8 l-3 -6.5Z" fill="#fff"/>
<path d="M52 96 l-26 -4 M52 101 l-26 3 M108 96 l26 -4 M108 101 l26 3" stroke="#fff" stroke-width="1.4" opacity=".85"/>
${eyes}<path d="M80 34 l6.5 8 l-6.5 8 l-6.5 -8Z" fill="url(#art-gold)" stroke="#9C5E00"/>`;
}

function ibex(ko: boolean): string {
  const eyes = ko
    ? KO_EYES
    : `<ellipse cx="56" cy="68" rx="7" ry="6" fill="#FFE066"/><ellipse cx="104" cy="68" rx="7" ry="6" fill="#FFE066"/><rect x="52" y="66" width="8" height="3.4" rx="1.5" fill="#111"/><rect x="100" y="66" width="8" height="3.4" rx="1.5" fill="#111"/>
<path d="M44 58 L66 62 M116 58 L94 62" stroke="#3B2410" stroke-width="4.5" stroke-linecap="round"/>`;
  return `<ellipse cx="80" cy="164" rx="56" ry="7" fill="#000" opacity=".35"/>
<path d="M22 170 Q26 118 80 116 Q134 118 138 170Z" fill="#8B5E3C"/><path d="M58 170 Q62 134 80 130 Q98 134 102 170Z" fill="#D9C2A0"/>
<path d="M40 132 Q80 150 120 132 L122 142 Q80 162 38 142Z" fill="url(#art-gold)" stroke="#9C5E00"/><circle cx="80" cy="149" r="6.5" fill="#0E6E5C" stroke="#FFE38F" stroke-width="2"/>
<path d="M58 44 Q30 30 22 2 Q20 -6 26 -2 Q40 24 64 34Z" fill="#6B4A2E"/><path d="M102 44 Q130 30 138 2 Q140 -6 134 -2 Q120 24 96 34Z" fill="#6B4A2E"/>
<path d="M30 14 l8 -3 M34 22 l8 -3 M40 29 l8 -3 M130 14 l-8 -3 M126 22 l-8 -3 M120 29 l-8 -3" stroke="#3E2A18" stroke-width="2.4" stroke-linecap="round"/>
<path d="M36 62 L18 52 L40 54Z M124 62 L142 52 L120 54Z" fill="#A77B52"/>
<path d="M40 60 Q40 32 80 32 Q120 32 120 60 L112 104 Q104 128 80 130 Q56 128 48 104Z" fill="#A77B52"/>
<path d="M62 92 Q80 86 98 92 L96 116 Q80 128 64 116Z" fill="#D9C2A0"/><ellipse cx="72" cy="104" rx="3" ry="4" fill="#3E2A18"/><ellipse cx="88" cy="104" rx="3" ry="4" fill="#3E2A18"/>
<path d="M70 126 Q80 152 90 126 Q80 134 70 126Z" fill="#5A3E26"/>
${eyes}<path d="M80 40 l6.5 8 l-6.5 8 l-6.5 -8Z" fill="url(#art-gold)" stroke="#9C5E00"/>`;
}

function falcon(ko: boolean): string {
  const eyes = ko
    ? KO_EYES
    : `<circle cx="58" cy="64" r="10" fill="#FFD43B"/><circle cx="102" cy="64" r="10" fill="#FFD43B"/><circle cx="58" cy="64" r="5" fill="#111"/><circle cx="102" cy="64" r="5" fill="#111"/><circle cx="60" cy="62" r="1.6" fill="#fff"/><circle cx="104" cy="62" r="1.6" fill="#fff"/>
<path d="M42 50 L70 58 M118 50 L90 58" stroke="#2B2118" stroke-width="5" stroke-linecap="round"/>`;
  return `<ellipse cx="80" cy="164" rx="56" ry="7" fill="#000" opacity=".35"/>
<path d="M10 168 Q14 112 52 104 L80 120 L108 104 Q146 112 150 168Z" fill="#6B5240"/>
<path d="M18 160 l18 -18 M28 166 l18 -18 M142 160 l-18 -18 M132 166 l-18 -18" stroke="#4A3828" stroke-width="3" stroke-linecap="round"/>
<path d="M56 170 Q60 126 80 122 Q100 126 104 170Z" fill="#F4ECDD"/><path d="M68 140 l4 4 l4 -4 M84 140 l4 4 l4 -4 M74 154 l4 4 l4 -4" stroke="#8C7660" stroke-width="2" fill="none"/>
<path d="M40 128 Q80 146 120 128 L122 138 Q80 158 38 138Z" fill="url(#art-gold)" stroke="#9C5E00"/><circle cx="80" cy="144" r="6" fill="#0E6E5C" stroke="#FFE38F" stroke-width="2"/>
<path d="M30 74 Q28 26 80 22 Q132 26 130 74 Q128 112 80 118 Q32 112 30 74Z" fill="#7A5C44"/>
<path d="M44 76 Q46 46 80 44 Q114 46 116 76 Q110 104 80 108 Q50 104 44 76Z" fill="#F4ECDD"/>
<path d="M40 70 Q56 54 74 70 Q58 82 40 70Z M120 70 Q104 54 86 70 Q102 82 120 70Z" fill="#3A2C20"/>
<path d="M66 78 Q80 70 94 78 L88 96 Q82 112 80 116 Q76 104 72 96Z" fill="#FFB020"/><path d="M80 116 Q76 104 72 96 L80 100Z" fill="#C97A00"/><path d="M70 82 Q80 78 90 82" stroke="#C97A00" stroke-width="2" fill="none"/>
${eyes}<path d="M80 26 l6.5 8 l-6.5 8 l-6.5 -8Z" fill="url(#art-gold)" stroke="#9C5E00"/>`;
}

/** Inner SVG markup of a guardian (viewBox 0 0 160 170); `ko` when defeated. */
export function guardianMarkup(id: Guardian["id"], ko = false): string {
  return id === "ibex" ? ibex(ko) : id === "falcon" ? falcon(ko) : leopard(ko);
}
