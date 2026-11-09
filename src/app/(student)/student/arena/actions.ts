"use server";

import { z } from "zod";
import { ARENA_GAMES, answerSchema, arenaError, finishSchema, runSchema, type ArenaFinish, type ArenaRun } from "@shared/arena/games";
import { requireActiveStudent } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const uuid = z.uuid();

/** A new round, built by the database from the student's studied units (no answers inside). */
export async function startArena(game: string, mode: string): Promise<{ run?: ArenaRun; error?: string }> {
  await requireActiveStudent();
  const g = z.enum(ARENA_GAMES).safeParse(game);
  const m = z.enum(["bot", "online"]).safeParse(mode);
  if (!g.success || !m.success) return { error: arenaError(undefined) };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("arena_start", { p_game: g.data, p_mode: m.data });
  if (error) return { error: arenaError(error.message) };
  const run = runSchema.safeParse(data);
  return run.success ? { run: run.data } : { error: arenaError(undefined) };
}

/** One answer, graded by the server at once. */
export async function answerArena(runId: string, index: number, answer: string): Promise<{ ok: boolean; answer: string | null } | null> {
  await requireActiveStudent();
  if (!uuid.safeParse(runId).success || !Number.isInteger(index)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("arena_answer", { p_run: runId, p_index: index, p_answer: answer.slice(0, 300) });
  if (error) return null;
  const r = answerSchema.safeParse(data);
  return r.success ? { ok: r.data.ok, answer: r.data.answer } : null;
}

export async function finishArena(runId: string): Promise<ArenaFinish | null> {
  await requireActiveStudent();
  if (!uuid.safeParse(runId).success) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("arena_finish", { p_run: runId });
  if (error) return null;
  const r = finishSchema.safeParse(data);
  return r.success ? r.data : null;
}
