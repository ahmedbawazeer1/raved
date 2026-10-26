import "server-only";
import type { LessonBlock, PackageLesson } from "@/lib/content/types";
import { createClient } from "@/lib/supabase/server";

export type SpeakingTask = NonNullable<PackageLesson["speaking_task"]>;
export type WritingTask = NonNullable<PackageLesson["writing_task"]>;

export interface TaskLesson {
  id: string;
  title: string;
  blocks: LessonBlock[];
  speaking: SpeakingTask | null;
  writing: WritingTask | null;
  unitTitle: string;
  grammarPoint: string;
  level: string;
  pathTitle: string;
  pathSlug: string;
  features: unknown;
}

/** A lesson the student may open (RLS: active member, published unit, not archived). */
export async function getTaskLesson(lessonId: string): Promise<TaskLesson | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("lessons")
    .select("id, title, blocks, speaking_task, writing_task, units(title, grammar_point, levels(code, paths(title, slug, features)))")
    .eq("id", lessonId)
    .maybeSingle();
  if (!data?.units?.levels?.paths) return null;
  return {
    id: data.id,
    title: data.title,
    blocks: (data.blocks ?? []) as unknown as LessonBlock[],
    speaking: (data.speaking_task as SpeakingTask | null) ?? null,
    writing: (data.writing_task as WritingTask | null) ?? null,
    unitTitle: data.units.title,
    grammarPoint: data.units.grammar_point,
    level: data.units.levels.code,
    pathTitle: data.units.levels.paths.title,
    pathSlug: data.units.levels.paths.slug,
    features: data.units.levels.paths.features,
  };
}

export interface PracticeTask {
  lessonId: string;
  lessonTitle: string;
  unitTitle: string;
  kind: "speaking" | "writing";
  prompt: string;
}

/** Speaking and writing tasks of the units the student has reached (published, on their path). */
export async function listPracticeTasks(pathId: string, unitIds: string[]): Promise<PracticeTask[]> {
  if (!unitIds.length) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("lessons")
    .select("id, title, position, speaking_task, writing_task, units!inner(id, title, position, levels!inner(position, path_id))")
    .in("unit_id", unitIds)
    .eq("units.levels.path_id", pathId)
    .eq("archived", false);
  const rows = (data ?? []).sort(
    (a, b) => a.units.levels.position - b.units.levels.position || a.units.position - b.units.position || a.position - b.position,
  );
  const tasks: PracticeTask[] = [];
  for (const l of rows) {
    const speaking = l.speaking_task as SpeakingTask | null;
    const writing = l.writing_task as WritingTask | null;
    if (speaking) tasks.push({ lessonId: l.id, lessonTitle: l.title, unitTitle: l.units.title, kind: "speaking", prompt: speaking.prompt_en });
    if (writing) tasks.push({ lessonId: l.id, lessonTitle: l.title, unitTitle: l.units.title, kind: "writing", prompt: writing.prompt_en });
  }
  return tasks;
}
