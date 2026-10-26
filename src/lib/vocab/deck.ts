/** Builds today's vocabulary review (pure, unit tested): due words first, then a few new ones. */
import type { SrsState } from "@/lib/srs";

export const NEW_PER_SESSION = 10;
export const MAX_SESSION = 30;

export interface DeckWord {
  id: string;
  word: string;
  ipa: string | null;
  partOfSpeech: string;
  meaningAr: string;
  exampleEn: string;
  exampleAr: string | null;
  /** order within the curriculum (unit order, then position) */
  order: number;
}

export interface DeckReview extends SrsState {
  vocabItemId: string;
  dueAt: string;
}

export interface DeckCard extends DeckWord {
  state: SrsState | null;
}

export interface Deck {
  cards: DeckCard[];
  dueCount: number;
  newCount: number;
  /** words the student has reviewed at least once */
  learnedCount: number;
  /** when the next word becomes due, if none is due now */
  nextDueAt: string | null;
}

export function buildDeck(words: DeckWord[], reviews: DeckReview[], now: Date): Deck {
  const byWord = new Map(reviews.map((r) => [r.vocabItemId, r]));
  const known = words.filter((w) => byWord.has(w.id));
  const due = known
    .filter((w) => new Date(byWord.get(w.id)!.dueAt) <= now)
    .sort((a, b) => byWord.get(a.id)!.dueAt.localeCompare(byWord.get(b.id)!.dueAt));
  const fresh = words.filter((w) => !byWord.has(w.id)).sort((a, b) => a.order - b.order);

  const dueCards = due.slice(0, MAX_SESSION);
  const newCards = fresh.slice(0, Math.min(NEW_PER_SESSION, MAX_SESSION - dueCards.length));
  const toCard = (w: DeckWord): DeckCard => {
    const r = byWord.get(w.id);
    return { ...w, state: r ? { ease: r.ease, intervalDays: r.intervalDays, repetitions: r.repetitions, lapses: r.lapses } : null };
  };

  const upcoming = known
    .map((w) => byWord.get(w.id)!.dueAt)
    .filter((d) => new Date(d) > now)
    .sort();

  return {
    cards: [...dueCards, ...newCards].map(toCard),
    dueCount: due.length,
    newCount: newCards.length,
    learnedCount: known.length,
    nextDueAt: dueCards.length + newCards.length === 0 ? (upcoming[0] ?? null) : null,
  };
}
