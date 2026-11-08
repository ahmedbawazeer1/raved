import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { checkLevelMap, type MapIssue } from "./curriculum";
import { parseProfile } from "./profile";
import { rowsToMap } from "./rows";
import { DEFAULT_TEMPLATES, unitTemplateSpec } from "./templates";

type Db = Awaited<ReturnType<typeof createClient>>;

/** Re-runs the code checks of a level map and stores them (shown in the studio). */
export async function refreshIssues(supabase: Db, levelId: string): Promise<MapIssue[]> {
  const map = await loadMap(supabase, levelId);
  if (!map) return [];
  const issues = checkLevelMap(map.map, map.unitTemplate, map.earlierWords);
  await supabase
    .from("curriculum_levels")
    .update({ issues: issues as never })
    .eq("level_id", levelId);
  return issues;
}

/** Reads a level map with what its checks need (also used by the studio page). */
export async function loadMap(supabase: Db, levelId: string) {
  const { data: level } = await supabase.from("levels").select("id, code, path_id, position").eq("id", levelId).single();
  if (!level) return null;
  const [{ data: cl }, { data: items }, { data: units }, { data: prof }, { data: earlier }] = await Promise.all([
    supabase.from("curriculum_levels").select("summary_ar").eq("level_id", levelId).maybeSingle(),
    supabase.from("curriculum_items").select("kind, code, text_en, text_ar, detail, unit_code, position").eq("level_id", levelId),
    supabase.from("curriculum_units").select("*").eq("level_id", levelId).order("position"),
    supabase.from("path_profiles").select("profile").eq("path_id", level.path_id).maybeSingle(),
    supabase.from("levels").select("id").eq("path_id", level.path_id).lt("position", level.position),
  ]);
  const profile = parseProfile(prof?.profile);
  const key = profile.levels.find((l) => l.code === level.code)?.unit_template ?? "standard";
  const { data: tpl } = await supabase.from("content_templates").select("spec").eq("kind", "unit").eq("key", key).maybeSingle();
  const parsed = unitTemplateSpec.safeParse(tpl?.spec);
  const unitTemplate = parsed.success ? parsed.data : unitTemplateSpec.parse(DEFAULT_TEMPLATES.find((t) => t.key === "standard")!.spec);
  const earlierIds = (earlier ?? []).map((l) => l.id);
  const { data: words } = earlierIds.length
    ? await supabase.from("curriculum_items").select("text_en").eq("kind", "word").in("level_id", earlierIds)
    : { data: [] as { text_en: string }[] };
  return {
    level,
    units: units ?? [],
    unitTemplate,
    earlierWords: (words ?? []).map((w) => w.text_en),
    map: rowsToMap(level.code, cl?.summary_ar ?? "", items ?? [], units ?? []),
  };
}
