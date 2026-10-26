import { En } from "@/components/en";

const ARABIC = /[؀-ۿ]/;
const LATIN_RUN = /([A-Za-z_][A-Za-z0-9_'’+\-/ .,?!]*[A-Za-z0-9_'’+?!.]|[A-Za-z])/g;

/** Arabic text with Latin runs (e.g. "A1 إلى B2") rendered left-to-right in Inter. Pure English stays one LTR run. */
export function MixedText({ text }: { text: string }) {
  if (!ARABIC.test(text)) return <En>{text}</En>;
  const parts = text.split(LATIN_RUN);
  return <>{parts.map((part, i) => (i % 2 === 1 ? <En key={i}>{part}</En> : part))}</>;
}
