import type { ReactNode } from "react";
import { MixedText } from "@/components/mixed-text";

/**
 * Minimal, safe Markdown for lesson explanations (no HTML, no links):
 * paragraphs, "- " lists, **bold**, *italic*. Latin runs render left-to-right.
 */
function inline(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0;
  let i = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > last) out.push(<MixedText key={`${keyPrefix}-t${i++}`} text={text.slice(last, index)} />);
    const token = match[0];
    if (token.startsWith("**")) out.push(<strong key={`${keyPrefix}-b${i++}`}><MixedText text={token.slice(2, -2)} /></strong>);
    else out.push(<em key={`${keyPrefix}-i${i++}`}><MixedText text={token.slice(1, -1)} /></em>);
    last = index + token.length;
  }
  if (last < text.length) out.push(<MixedText key={`${keyPrefix}-t${i++}`} text={text.slice(last)} />);
  return out;
}

export function Markdown({ source }: { source: string }) {
  const blocks = source.trim().split(/\n{2,}/);
  return (
    <div className="flex flex-col gap-3 text-[16px] leading-[1.95]">
      {blocks.map((block, bi) => {
        const lines = block.split("\n");
        if (lines.every((l) => /^\s*[-•]\s+/.test(l))) {
          return (
            <ul key={bi} className="list-disc ps-5">
              {lines.map((l, li) => (
                <li key={li}>{inline(l.replace(/^\s*[-•]\s+/, ""), `${bi}-${li}`)}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={bi}>
            {lines.map((l, li) => (
              <span key={li}>
                {li > 0 && <br />}
                {inline(l, `${bi}-${li}`)}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}
