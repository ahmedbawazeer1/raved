/** Small pure helpers for practice (unit tested). */
import type { LessonBlock } from "@/lib/content/types";

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

/** Lesson explanation for the assistant: text, reading and tables only (never exercises), capped. */
export function lessonSummary(blocks: LessonBlock[], max = 1500): string {
  const parts: string[] = [];
  for (const b of blocks) {
    if (b.type === "text" && b.markdown_ar) parts.push(b.markdown_ar);
    else if (b.type === "reading" && b.text_en) parts.push(b.text_en);
    else if (b.type === "audio" && b.text_en) parts.push(b.text_en);
    else if (b.type === "table" && b.rows) parts.push([b.headers ?? [], ...b.rows].map((r) => r.join(" | ")).join("\n"));
  }
  const text = parts.join("\n\n").replace(/[#*_`>]/g, "").replace(/\n{3,}/g, "\n\n").trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export interface Highlight {
  /** null = plain text */
  error: number | null;
  text: string;
}

/**
 * Splits the student's text into segments, marking each error substring (in order, after
 * the previous one) with its number. Errors not found are left unhighlighted.
 */
export function highlightErrors(text: string, errors: { text: string }[]): { segments: Highlight[]; found: boolean[] } {
  const marks: { start: number; end: number; index: number }[] = [];
  const found = errors.map(() => false);
  let from = 0;
  errors.forEach((e, index) => {
    if (!e.text) return;
    let at = text.indexOf(e.text, from);
    if (at < 0) at = text.indexOf(e.text);
    if (at < 0 || marks.some((m) => at < m.end && at + e.text.length > m.start)) return;
    marks.push({ start: at, end: at + e.text.length, index });
    found[index] = true;
    from = at + e.text.length;
  });
  marks.sort((a, b) => a.start - b.start);
  const segments: Highlight[] = [];
  let pos = 0;
  for (const m of marks) {
    if (m.start > pos) segments.push({ error: null, text: text.slice(pos, m.start) });
    segments.push({ error: m.index, text: text.slice(m.start, m.end) });
    pos = m.end;
  }
  if (pos < text.length) segments.push({ error: null, text: text.slice(pos) });
  return { segments, found };
}
