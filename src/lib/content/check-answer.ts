import type { PackageQuestion } from "./types";

/** Same normalisation as the server's private.normalize_answer(). */
export function normalizeAnswer(text: string): string {
  return text.trim().replace(/\s+/g, " ").replace(/[.!?,;:]+$/, "").toLowerCase();
}

/** Local check for in-lesson exercises (allowed offline; unit quizzes are graded on the server). */
export function checkAnswer(q: Pick<PackageQuestion, "kind" | "answer">, given: unknown): boolean {
  switch (q.kind) {
    case "mcq":
    case "true_false":
      return typeof given === "number" && given === q.answer;
    case "fill_blank":
      return typeof given === "string" && typeof q.answer === "string" && normalizeAnswer(given) === normalizeAnswer(q.answer);
    case "order_words":
      return (
        Array.isArray(given) &&
        Array.isArray(q.answer) &&
        given.map(normalizeAnswer).join(" ") === (q.answer as string[]).map(normalizeAnswer).join(" ")
      );
  }
}

/** Deterministic shuffle so server and client render the same order. */
export function shuffleWords(words: string[], seed: string): string[] {
  const score = (w: string, i: number) => {
    let h = 2166136261;
    for (const ch of `${seed}:${w}:${i}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    return h >>> 0;
  };
  const shuffled = words.map((w, i) => ({ w, s: score(w, i) })).sort((a, b) => a.s - b.s).map((x) => x.w);
  // Never present the words already in the right order.
  if (shuffled.join(" ") === words.join(" ") && words.length > 1) return [...shuffled.slice(1), shuffled[0]];
  return shuffled;
}
