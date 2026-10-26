import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { buildDeck, type Deck, type DeckReview, type DeckWord } from "./deck";

/**
 * Words the student has met: those of every unit in which they completed at least one
 * lesson, on their primary path. RLS limits it to their own progress and live units.
 */
export const getVocabDeck = cache(async (userId: string, pathId: string): Promise<Deck> => {
  const supabase = await createClient();
  const { data: progress } = await supabase
    .from("lesson_progress")
    .select("lessons(unit_id)")
    .eq("student_id", userId)
    .eq("status", "completed");
  const unitIds = [...new Set((progress ?? []).map((p) => p.lessons?.unit_id).filter((id): id is string => Boolean(id)))];
  if (!unitIds.length) return buildDeck([], [], new Date());

  const { data: items } = await supabase
    .from("vocab_items")
    .select("id, word, ipa, part_of_speech, meaning_ar, example_en, example_ar, position, units!inner(position, levels!inner(position, path_id))")
    .in("unit_id", unitIds)
    .eq("archived", false)
    .eq("units.levels.path_id", pathId);

  const words: DeckWord[] = (items ?? []).map((v) => ({
    id: v.id,
    word: v.word,
    ipa: v.ipa,
    partOfSpeech: v.part_of_speech,
    meaningAr: v.meaning_ar,
    exampleEn: v.example_en,
    exampleAr: v.example_ar,
    order: v.units.levels.position * 1_000_000 + v.units.position * 1_000 + v.position,
  }));
  if (!words.length) return buildDeck([], [], new Date());

  const { data: rows } = await supabase
    .from("vocab_reviews")
    .select("vocab_item_id, due_at, ease, interval_days, repetitions, lapses")
    .eq("student_id", userId)
    .in("vocab_item_id", words.map((w) => w.id));
  const reviews: DeckReview[] = (rows ?? []).map((r) => ({
    vocabItemId: r.vocab_item_id,
    dueAt: r.due_at,
    ease: Number(r.ease),
    intervalDays: r.interval_days,
    repetitions: r.repetitions,
    lapses: r.lapses,
  }));

  return buildDeck(words, reviews, new Date());
});
