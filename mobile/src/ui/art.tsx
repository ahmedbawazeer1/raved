import { SvgXml } from "react-native-svg";
import { ART_DEFS } from "@shared/art/defs";

/**
 * Draws Raved's illustrations (the same SVG markup as the website, from shared/art) with the shared
 * gradients and icons included. Only internal strings go in, never user input.
 */
export function Art({ markup, viewBox, width, height }: { markup: string; viewBox: string; width: number; height: number }) {
  const xml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"><defs>${ART_DEFS}</defs>${markup}</svg>`;
  return <SvgXml xml={xml} width={width} height={height} />;
}
