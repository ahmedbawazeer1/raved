import { wakeAgent } from "../agent/wake";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../types/db";

/**
 * Which unit the factory builds next (owner decisions 2026-11-08):
 * - units are built in order, one at a time (never two «building»);
 * - «البناء للأمام»: while one unit waits for review, the factory may build the one after it, so at most
 *   two units are in progress (building + review). Off = the old rule, one unit at a time.
 * Pure, unit-tested; the queue (web) and the agent runner both use it.
 */
export type UnitRow = { id: string; code: string; position: number; build_status: string };

export function pickNextUnit(units: UnitRow[], ahead: boolean): UnitRow | null {
  const ordered = [...units].sort((a, b) => a.position - b.position);
  if (ordered.some((u) => u.build_status === "building")) return null;
  const inReview = ordered.filter((u) => u.build_status === "review").length;
  if (inReview >= (ahead ? 2 : 1)) return null;
  for (const u of ordered) {
    if (u.build_status === "approved" || u.build_status === "review") continue;
    return u; // planned or failed: the first one not done, in order
  }
  return null;
}

/** Read the «البناء للأمام» switch (on unless the admin turned it off). */
export function buildAheadOn(value: unknown): boolean {
  return value !== false;
}

type Db = SupabaseClient<Database>;

/** Queues the next unit of a level if the rules allow it. Returns its code, or null. */
export async function queueNextUnitWith(db: Db, levelId: string): Promise<string | null> {
  const [{ data: level }, { data: units }, { data: setting }] = await Promise.all([
    db.from("levels").select("path_id").eq("id", levelId).single(),
    db.from("curriculum_units").select("id, code, position, build_status").eq("level_id", levelId).order("position"),
    db.from("settings").select("value").eq("key", "factory_build_ahead").maybeSingle(),
  ]);
  if (!level || !units?.length) return null;
  const next = pickNextUnit(units, buildAheadOn(setting?.value));
  if (!next) return null;
  const { data: job, error } = await db
    .from("agent_jobs")
    .insert({ kind: "factory_unit", path_id: level.path_id, input: { curriculum_unit_id: next.id, unit_code: next.code } })
    .select("id")
    .single();
  await wakeAgent();
  if (error || !job) return null;
  await db.from("curriculum_units").update({ build_status: "building", build_job_id: job.id }).eq("id", next.id);
  return next.code;
}
