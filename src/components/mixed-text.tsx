import { En } from "@/components/en";

const LATIN_RUN = /([A-Za-z][A-Za-z0-9'’+\-/ .,?!]*[A-Za-z0-9'’+?!.]|[A-Za-z])/g;

/** Arabic text with Latin runs (e.g. "A1 إلى B2") rendered left-to-right in Inter. */
export function MixedText({ text }: { text: string }) {
  const parts = text.split(LATIN_RUN);
  return <>{parts.map((part, i) => (i % 2 === 1 ? <En key={i}>{part}</En> : part))}</>;
}
