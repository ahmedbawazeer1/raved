/**
 * «رحلة حضرموت» as one SVG string (same drawing as the web map in src/components/student/journey-map.tsx,
 * from shared/art). Tapping is handled by views laid over the stops.
 */
import { rafedMarkup } from "@shared/art/rafed";
import { roadPath, sceneryMarkup, stopIcon, type JourneyLayout, type Landmark } from "@shared/art/journey";
import type { UnitView } from "@shared/student/progress";

const FACE: Record<UnitView["state"], string> = { done: "url(#art-done)", now: "url(#art-now)", open: "url(#art-open)", locked: "url(#art-lock)" };
const BASE: Record<UnitView["state"], string> = { done: "#07473B", now: "#B26B00", open: "#8FB8AE", locked: "#868E96" };

/** Only internal text reaches the SVG; stop names come from approved content but are escaped anyway. */
function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

function stopNode(unit: UnitView, index: number, x: number, y: number): string {
  const name = unit.stop ?? `الوحدة ${unit.position}`;
  const locked = unit.state === "locked";
  const progress = unit.lessons.length ? unit.lessonsDone / (unit.lessons.length + 1) : 0;
  const w = Math.max(72, name.length * 7.5 + 26);
  return `<g transform="translate(${x} ${y})">
<ellipse cy="22" rx="38" ry="11" fill="#000" opacity=".22"/>
${unit.state === "now" ? `<circle r="40" fill="#F5A524" opacity=".35"/><circle r="41" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="5"/><circle r="41" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-dasharray="${Math.max(4, progress * 257.6)} 257.6" transform="rotate(-90)"/>` : ""}
<circle cy="7" r="33" fill="${BASE[unit.state]}"/><circle r="33" fill="${FACE[unit.state]}"/>
<circle r="27" fill="none" stroke="rgba(255,255,255,.45)" stroke-width="2"/>
<path d="M-20 -18 Q-6 -30 12 -26" stroke="rgba(255,255,255,.6)" stroke-width="4" fill="none" stroke-linecap="round"/>
<use href="#${stopIcon(unit.stop, index)}" x="-20" y="-20" width="40" height="40" opacity="${locked ? 0.45 : 1}"/>
${unit.state === "done" ? `<g transform="translate(25 -24)"><circle r="11" fill="#12B886" stroke="#fff" stroke-width="3"/><path d="M-5 0 l3.2 3.8 l6.3 -7" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round"/></g>` : ""}
${locked ? `<g transform="translate(22 -22)"><circle r="12" fill="#fff"/><use href="#art-i-lock" x="-10" y="-10" width="20" height="20"/></g>` : ""}
<g transform="translate(0 50)"><rect x="${-w / 2}" y="-12" width="${w}" height="24" rx="12" fill="${locked ? "rgba(255,255,255,.75)" : "#fff"}"/>
<text y="5" text-anchor="middle" font-size="12.5" font-weight="700" fill="#12201D">${esc(name)}</text></g>
${unit.state === "now" ? `<g transform="translate(0 -70)"><rect x="-30" y="-15" width="60" height="28" rx="10" fill="#fff"/><path d="M-6 13 l6 8 l6 -8Z" fill="#fff"/><text y="5" text-anchor="middle" font-size="14" font-weight="800" fill="#8A5A00">${unit.lessonsDone ? "تابع" : "ابدأ"}</text></g>` : ""}
</g>`;
}

export function journeyMarkup(units: UnitView[], layout: JourneyLayout, marks: Landmark[], found: Set<string>): string {
  const stamps = units.filter((u) => u.state === "done").length;
  const nowIndex = units.findIndex((u) => u.state === "now");
  const focus = nowIndex >= 0 ? nowIndex : Math.max(0, stamps - 1);
  const reached = nowIndex >= 0 ? nowIndex : units.length - 1;
  const firstLocked = units.findIndex((u) => u.state === "locked");
  const fogY = firstLocked < 0 ? 0 : layout.stops[firstLocked].y + 70;
  const road = roadPath(layout.stops);
  const clouds = [
    [70, fogY - 80],
    [300, fogY - 170],
    [130, fogY - 300],
    [280, fogY - 420],
  ]
    .filter(([, y]) => y > 40)
    .map(
      ([x, y]) =>
        `<g transform="translate(${x} ${y})"><ellipse rx="44" ry="15" fill="#fff" opacity=".85"/><ellipse cx="22" cy="-9" rx="24" ry="14" fill="#fff" opacity=".85"/><ellipse cx="-20" cy="-6" rx="18" ry="11" fill="#fff" opacity=".85"/></g>`,
    )
    .join("");
  const companion = units[focus] && units[focus].state !== "locked" ? layout.stops[focus] : null;
  return [
    sceneryMarkup(layout),
    ...marks.map(
      (m) =>
        `<g transform="translate(${m.x} ${m.y})">${m.markup}${found.has(m.key) ? "" : `<circle cx="${m.r * 0.55}" cy="${-m.r * 0.55}" r="7" fill="#FFD43B" stroke="#fff" stroke-width="2"/>`}</g>`,
    ),
    `<path d="${road}" stroke="#D4B07C" stroke-width="22" fill="none" stroke-linecap="round"/>`,
    `<path d="${road}" stroke="#FFF7E3" stroke-width="15" fill="none" stroke-linecap="round"/>`,
    `<path d="${roadPath(layout.stops, reached)}" stroke="#12B886" stroke-width="5" fill="none" stroke-linecap="round" stroke-dasharray="1 11"/>`,
    fogY > 0 ? `<rect width="390" height="${fogY}" fill="url(#art-fog)"/>${clouds}` : "",
    ...units.map((u, i) => stopNode(u, i, layout.stops[i].x, layout.stops[i].y)),
    companion
      ? `<g transform="translate(${companion.x + (companion.x > 195 ? -100 : 46)} ${companion.y - 50}) scale(0.24)">${rafedMarkup({ id: "rjm", mood: "happy", wave: true, filters: false })}</g>`
      : "",
  ].join("\n");
}
