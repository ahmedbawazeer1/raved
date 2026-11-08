import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { fetchLearnedWords, fetchVocabDeck } from "@shared/data/student";

/** Words the student has met (shared query, cached per request). */
export const getLearnedWords = cache(async (userId: string, pathId: string) => fetchLearnedWords(await createClient(), userId, pathId));

/** Today's review deck (shared query, cached per request). */
export const getVocabDeck = cache(async (userId: string, pathId: string) => fetchVocabDeck(await createClient(), userId, pathId));
