import "server-only";
import type { createClient } from "@/lib/supabase/server";

type Db = Awaited<ReturnType<typeof createClient>>;

/**
 * Units are built one by one, in order (owner decision): the next unit is queued only when no unit of
 * the level is being built or waiting for review, and every unit before it is published.
 * Returns the queued unit's code, or null (nothing to do, or the factory is busy with one).
 */
export async function queueNextUnit(supabase: Db, levelId: string): Promise<string | null> {
  const { data: level } = await supabase.from("levels").select("path_id").eq("id", levelId).single();
  const { data: units } = await supabase.from("curriculum_units").select("id, code, position, build_status").eq("level_id", levelId).order("position");
  if (!level || !units?.length) return null;
  if (units.some((u) => u.build_status === "building" || u.build_status === "review")) return null;
  const next = units.find((u) => u.build_status !== "approved");
  if (!next) return null;
  const { data: job, error } = await supabase
    .from("agent_jobs")
    .insert({ kind: "factory_unit", path_id: level.path_id, input: { curriculum_unit_id: next.id, unit_code: next.code } })
    .select("id")
    .single();
  if (error || !job) return null;
  await supabase.from("curriculum_units").update({ build_status: "building", build_job_id: job.id }).eq("id", next.id);
  return next.code;
}
