/**
 * The dam guardians: the unit quiz is a battle against the guardian of the level's world.
 * SVG markup for viewBox GUARDIAN_VIEWBOX, self-contained (own gradients). Fixed internal strings only.
 */
import { paint } from "./paint";

export type GuardianId = "spring" | "valley" | "river" | "delta" | "sea";
export interface Guardian {
  id: GuardianId;
  name: string;
}

const LOOK: Record<GuardianId, { name: string; stone: string; moss: string; crystal: string }> = {
  spring: { name: "حارس النبع", stone: "#5FA8A0", moss: "#3CC48F", crystal: "#8EDDF5" },
  valley: { name: "حارس الوادي", stone: "#B58A5A", moss: "#6FA84B", crystal: "#F5A524" },
  river: { name: "حارس النهر", stone: "#7277BC", moss: "#3CC48F", crystal: "#5CC8F0" },
  delta: { name: "حارس الدلتا", stone: "#4E9A8E", moss: "#8BD35C", crystal: "#9BE3E9" },
  sea: { name: "حارس البحر", stone: "#3D5A99", moss: "#2FB59A", crystal: "#6CCBF2" },
};
export const GUARDIANS: Guardian[] = (Object.keys(LOOK) as GuardianId[]).map((id) => ({ id, name: LOOK[id].name }));
export const GUARDIAN_VIEWBOX = "0 -6 220 256";
export const GUARDIAN_RATIO = 220 / 256;

/** The guardian of a level's world: A1 → spring, A2 → valley, B1 → river, B2 → delta, exam track → sea. */
export function guardianFor(levelCode: string | null | undefined): Guardian {
  const c = (levelCode ?? "").toUpperCase();
  const i = c.startsWith("A1") ? 0 : c.startsWith("A2") ? 1 : c.startsWith("B1") ? 2 : c.startsWith("B2") ? 3 : c ? 4 : 0;
  return GUARDIANS[i];
}

export function guardianMarkup(id: GuardianId, ko = false, prefix = "g"): string {
  const L = LOOK[id] ?? LOOK.river,
    P = paint(prefix + id);
  const stone = P.rg(L.stone, 0.35, -0.38),
    moss = P.rg(L.moss, 0.35, -0.3);
  const eyes = ko
    ? `<g stroke="#2E3060" stroke-width="6" stroke-linecap="round"><path d="M72 120 l20 20 M92 120 l-20 20"/><path d="M128 120 l20 20 M148 120 l-20 20"/></g>`
    : `<g class="geyes"><ellipse cx="82" cy="130" rx="14" ry="12" fill="#FFF5C2"/><ellipse cx="138" cy="130" rx="14" ry="12" fill="#FFF5C2"/><circle cx="85" cy="132" r="6.5" fill="#2E3060"/><circle cx="135" cy="132" r="6.5" fill="#2E3060"/></g>`;
  const mouth = ko ? "M88 172 Q110 160 132 172 Q110 168 88 172Z" : "M84 166 Q110 156 136 166 Q110 178 84 166Z";
  const body = `<ellipse cx="110" cy="240" rx="60" ry="9" fill="#000" opacity=".22"/>
<g class="all" ${ko ? 'transform="rotate(-12 110 226) translate(0 14)"' : ""}>
<g class="fistL"><circle cx="30" cy="156" r="24" fill="${stone}"/><path d="M22 140 a10 10 0 0 1 12 -3" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" opacity=".4"/></g>
<g class="fistR"><circle cx="190" cy="156" r="24" fill="${stone}"/><path d="M182 140 a10 10 0 0 1 12 -3" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" opacity=".4"/></g>
<g class="gb"><g class="crystal"><path d="M110 0 C110 0 92 26 92 38 a18 18 0 0 0 36 0 C128 26 110 0 110 0Z" fill="${P.rg(L.crystal, 0.5, -0.25)}"/><ellipse cx="104" cy="34" rx="4" ry="7" fill="#fff" opacity=".6"/></g>
<path d="M110 46 C162 46 184 86 184 136 C184 188 156 214 110 214 C64 214 36 188 36 136 C36 86 58 46 110 46 Z" fill="${stone}"/>
<path d="M60 78 C70 60 92 50 110 50 C96 58 84 70 78 84 C72 92 56 92 60 78Z" fill="${moss}"/><circle cx="150" cy="70" r="9" fill="${moss}"/><circle cx="162" cy="80" r="6" fill="${moss}"/>
<path d="M150 96 l-10 16 l8 6 l-6 14" stroke="#000" stroke-opacity=".25" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M60 98 L104 110 L101 121 L57 109Z" fill="#2E3060"/><path d="M160 98 L116 110 L119 121 L163 109Z" fill="#2E3060"/>
${eyes}
<path class="gmouth" d="${mouth}" fill="#23244A"/><path d="M98 164 l5 7 l5 -8z" fill="#fff"/><path d="M114 163 l5 8 l5 -7z" fill="#fff"/>
<path class="gflash" d="M110 46 C162 46 184 86 184 136 C184 188 156 214 110 214 C64 214 36 188 36 136 C36 86 58 46 110 46 Z" fill="#fff" opacity="0"/></g>
${ko ? `<g fill="#FFD95A"><path d="M60 40 l4 8 9 1 -7 6 2 9 -8 -5 -8 5 2 -9 -7 -6 9 -1z"/><path d="M160 34 l4 8 9 1 -7 6 2 9 -8 -5 -8 5 2 -9 -7 -6 9 -1z"/></g>` : ""}
</g>`;
  return `<defs>${P.defs()}</defs>${body}`;
}
