import "server-only";
import { getLearnedWords } from "@/lib/vocab/queries";
import type { GameWord } from "./logic";

/** Words for practice games: what the student has learned on their path. */
export async function getGameWords(userId: string, pathId: string): Promise<GameWord[]> {
  const words = await getLearnedWords(userId, pathId);
  return words.map((w) => ({ id: w.id, word: w.word, meaning: w.meaningAr, example: w.exampleEn }));
}
