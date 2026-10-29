"use server";

import { z } from "zod";
import { requireActiveStudent } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const GAMES = ["flashcards", "match", "listen", "memory", "speed", "spell", "swipe", "dictation", "pronounce"] as const;

/** A finished practice game: 5 points, once per game per day. Returns games played today. */
export async function recordGame(game: string): Promise<number | null> {
  await requireActiveStudent();
  const parsed = z.enum(GAMES).safeParse(game);
  if (!parsed.success) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("record_game", { p_game: parsed.data });
  return error ? null : data;
}
