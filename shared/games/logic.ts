/** Shared logic for the vocabulary games (pure, unit tested). */

export interface GameWord {
  id: string;
  word: string;
  meaning: string;
  example: string;
}

export type GameKind = "flashcards" | "match" | "listen" | "memory" | "speed" | "spell" | "swipe" | "dictation" | "pronounce";

export const GAME_TITLES: Record<GameKind, { title: string; hint: string; icon: string }> = {
  flashcards: { title: "بطاقات تنقلب", hint: "اضغط البطاقة لترى المعنى، واسمع النطق.", icon: "🃏" },
  match: { title: "وصّل الأزواج", hint: "اختر الكلمة ثم معناها.", icon: "🔗" },
  listen: { title: "اسمع واختر", hint: "اسمع الكلمة واختر معناها.", icon: "👂" },
  memory: { title: "لعبة الذاكرة", hint: "اقلب بطاقتين: كلمة ومعناها.", icon: "🧠" },
  speed: { title: "سباق الدقيقة", hint: "أكبر عدد من الإجابات الصحيحة في 60 ثانية.", icon: "⏱️" },
  spell: { title: "خمّن الكلمة", hint: "رتّب الحروف لتكتب الكلمة.", icon: "🔤" },
  swipe: { title: "صح أو خطأ", hint: "هل المعنى صحيح؟ اسحب يميناً أو يساراً، أو اضغط الزر.", icon: "👆" },
  dictation: { title: "إملاء", hint: "اسمع الجملة واكتبها.", icon: "✍️" },
  pronounce: { title: "تحدي النطق", hint: "انطق الكلمة والهاتف يسمعك.", icon: "🎤" },
};

/** Small deterministic random generator, so server and client agree and tests are stable. */
export function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: T[], rand: () => number = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Up to `count` other words, never the target, never a duplicate meaning. */
export function distractors(target: GameWord, pool: GameWord[], count: number, rand: () => number = Math.random): GameWord[] {
  const seen = new Set([target.meaning, target.word.toLowerCase()]);
  const out: GameWord[] = [];
  for (const w of shuffle(pool, rand)) {
    if (out.length >= count) break;
    if (w.id === target.id || seen.has(w.meaning) || seen.has(w.word.toLowerCase())) continue;
    seen.add(w.meaning);
    seen.add(w.word.toLowerCase());
    out.push(w);
  }
  return out;
}

/** A multiple-choice round: the right meaning plus distractors, shuffled. */
export function choiceRound(target: GameWord, pool: GameWord[], options = 4, rand: () => number = Math.random): GameWord[] {
  return shuffle([target, ...distractors(target, pool, options - 1, rand)], rand);
}

/** Lower case, straight apostrophes, no punctuation, single spaces (for typing and speech). */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/[^a-z0-9' ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Typed or spoken text matches the target (ignoring case and punctuation). */
export function sameText(given: string, target: string): boolean {
  return normalizeText(given) === normalizeText(target);
}

/** Speech recognition often returns a few alternatives or extra words: accept when the word is among them. */
export function heardWord(alternatives: string[], target: string): boolean {
  const t = normalizeText(target);
  return alternatives.some((a) => {
    const n = normalizeText(a);
    return n === t || ` ${n} `.includes(` ${t} `);
  });
}

/** Letters of a word, shuffled so the result is never the word itself (when possible). */
export function scramble(word: string, rand: () => number = Math.random): string[] {
  const letters = word.split("");
  if (new Set(letters).size < 2) return letters;
  for (let i = 0; i < 10; i++) {
    const s = shuffle(letters, rand);
    if (s.join("") !== word) return s;
  }
  return [...letters].reverse();
}

/** Words fit for spelling and pronouncing: a single word, letters only, 3–9 letters. */
export function singleWords(words: GameWord[]): GameWord[] {
  return words.filter((w) => /^[a-z]{3,9}$/i.test(w.word));
}

/** Swipe cards: half show the true meaning, half a wrong one. */
export function swipeCards(words: GameWord[], count: number, rand: () => number = Math.random): { word: GameWord; meaning: string; correct: boolean }[] {
  return shuffle(words, rand)
    .slice(0, count)
    .map((w, i) => {
      if (i % 2 === 0 || words.length < 2) return { word: w, meaning: w.meaning, correct: true };
      const other = distractors(w, words, 1, rand)[0];
      return other ? { word: w, meaning: other.meaning, correct: false } : { word: w, meaning: w.meaning, correct: true };
    });
}
