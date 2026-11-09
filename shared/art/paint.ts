/**
 * 2.5D paint helpers for the art: every colour gets a glossy radial fill (light from the top-left)
 * or a vertical fill. Gradients are collected per drawing and emitted in its own <defs>, so each SVG
 * is self-contained (works on the web and in react-native-svg on mobile).
 */

/** Lighten (t > 0, toward white) or darken (t < 0, toward black) a #rrggbb colour. */
export function mix(hex: string, t: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(t > 0 ? v + (255 - v) * t : v * (1 + t)));
  return "#" + ch.map((v) => v.toString(16).padStart(2, "0")).join("");
}

export interface Paint {
  /** Glossy radial fill: url(#id). */
  rg(hex: string, light?: number, dark?: number): string;
  /** Vertical fill: url(#id). */
  lg(hex: string, light?: number, dark?: number): string;
  /** The <defs> content collected so far. */
  defs(): string;
}

/** A paint box. `prefix` keeps gradient ids unique when several drawings share a page. */
export function paint(prefix: string): Paint {
  const made = new Map<string, string>();
  const key = (k: string, hex: string, l: number, d: number) => `${prefix}${k}${hex.slice(1)}${Math.round(l * 100)}${Math.round(-d * 100)}`;
  return {
    rg(hex, l = 0.45, d = -0.32) {
      const id = key("r", hex, l, d);
      if (!made.has(id))
        made.set(
          id,
          `<radialGradient id="${id}" cx=".34" cy=".26" r=".95"><stop offset="0" stop-color="${mix(hex, l)}"/><stop offset=".48" stop-color="${hex}"/><stop offset="1" stop-color="${mix(hex, d)}"/></radialGradient>`,
        );
      return `url(#${id})`;
    },
    lg(hex, l = 0.22, d = -0.22) {
      const id = key("l", hex, l, d);
      if (!made.has(id))
        made.set(
          id,
          `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${mix(hex, l)}"/><stop offset="1" stop-color="${mix(hex, d)}"/></linearGradient>`,
        );
      return `url(#${id})`;
    },
    defs() {
      return [...made.values()].join("");
    },
  };
}

/** Make an id safe for SVG (React's useId contains colons). */
export function safeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, "");
}
