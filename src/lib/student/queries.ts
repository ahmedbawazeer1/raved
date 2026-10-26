import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { buildCurriculum, type UnitInput, type UnitView } from "./progress";

export interface StudentPath {
  id: string;
  slug: string;
  title: string;
  features: unknown;
}

/** The student's primary path (from their primary enrollment). */
export const getPrimaryPath = cache(async (userId: string): Promise<StudentPath | null> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("enrollments")
    .select("paths(id, slug, title, features)")
    .eq("student_id", userId)
    .eq("is_primary", true)
    .maybeSingle();
  return (data?.paths as StudentPath | null) ?? null;
});

export interface LevelInfo {
  id: string;
  code: string;
  title: string;
  position: number;
}

export interface Curriculum {
  levels: LevelInfo[];
  units: UnitView[];
  completedLessonIds: Set<string>;
  passedQuizIds: Set<string>;
}

/** Published units of a path with the student's progress (RLS keeps it to their own rows). */
export const getCurriculum = cache(async (userId: string, pathId: string): Promise<Curriculum> => {
  const supabase = await createClient();
  const { data: levels } = await supabase
    .from("levels")
    .select("id, code, title, position, kind, units(id, code, title, position, status, package_size_bytes, quizzes(id, kind), lessons(id, position, title, skill, est_minutes, archived))")
    .eq("path_id", pathId)
    .eq("kind", "general")
    .order("position");

  const units: UnitInput[] = [];
  for (const level of levels ?? []) {
    for (const u of level.units ?? []) {
      if (u.status !== "published") continue;
      units.push({
        id: u.id,
        code: u.code,
        title: u.title,
        position: u.position,
        levelCode: level.code,
        levelPosition: level.position,
        sizeBytes: u.package_size_bytes,
        quizId: (u.quizzes ?? []).find((q) => q.kind === "unit")?.id ?? null,
        lessons: (u.lessons ?? [])
          .filter((l) => !l.archived)
          .map((l) => ({ id: l.id, position: l.position, title: l.title, skill: l.skill, estMinutes: l.est_minutes })),
      });
    }
  }

  const lessonIds = units.flatMap((u) => u.lessons.map((l) => l.id));
  const quizIds = units.map((u) => u.quizId).filter((id): id is string => Boolean(id));
  const [{ data: progress }, { data: attempts }] = await Promise.all([
    lessonIds.length
      ? supabase.from("lesson_progress").select("lesson_id").eq("student_id", userId).eq("status", "completed").in("lesson_id", lessonIds)
      : Promise.resolve({ data: [] as { lesson_id: string }[] }),
    quizIds.length
      ? supabase.from("quiz_attempts").select("quiz_id").eq("student_id", userId).eq("passed", true).in("quiz_id", quizIds)
      : Promise.resolve({ data: [] as { quiz_id: string }[] }),
  ]);
  const completedLessonIds = new Set((progress ?? []).map((p) => p.lesson_id));
  const passedQuizIds = new Set((attempts ?? []).map((a) => a.quiz_id));

  return {
    levels: (levels ?? []).map(({ id, code, title, position }) => ({ id, code, title, position })),
    units: buildCurriculum(units, { completedLessonIds, passedQuizIds }),
    completedLessonIds,
    passedQuizIds,
  };
});
