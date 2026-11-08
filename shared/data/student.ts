/**
 * Student data queries used by BOTH apps (web: server Supabase client; mobile: app client).
 * RLS keeps every query to the signed-in student's own rows. Change a query here once.
 */
import type { Db } from "./client";
import { buildCurriculum, type UnitInput, type UnitView } from "../student/progress";
import { buildDeck, type Deck, type DeckReview, type DeckWord } from "../vocab/deck";

export interface StudentPath {
  id: string;
  slug: string;
  title: string;
  features: unknown;
}

/** The student's primary path (from their primary enrollment). */
export async function fetchPrimaryPath(db: Db, userId: string): Promise<StudentPath | null> {
  const { data } = await db.from("enrollments").select("paths(id, slug, title, features)").eq("student_id", userId).eq("is_primary", true).maybeSingle();
  return (data?.paths as StudentPath | null) ?? null;
}

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

/** Published units of a path with the student's progress. */
export async function fetchCurriculum(db: Db, userId: string, pathId: string): Promise<Curriculum> {
  const { data: levels } = await db
    .from("levels")
    .select(
      "id, code, title, position, kind, units(id, code, title, position, status, package_size_bytes, stop_ar, quizzes(id, kind), lessons(id, position, title, skill, est_minutes, archived))",
    )
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
        stop: u.stop_ar,
        lessons: (u.lessons ?? [])
          .filter((l) => !l.archived)
          .map((l) => ({ id: l.id, position: l.position, title: l.title, skill: l.skill, estMinutes: l.est_minutes })),
      });
    }
  }

  const lessonIds = units.flatMap((u) => u.lessons.map((l) => l.id));
  const quizIds = units.map((u) => u.quizId).filter((id): id is string => Boolean(id));
  const [{ data: progress }, { data: attempts }, { data: enrollment }] = await Promise.all([
    lessonIds.length
      ? db.from("lesson_progress").select("lesson_id").eq("student_id", userId).eq("status", "completed").in("lesson_id", lessonIds)
      : Promise.resolve({ data: [] as { lesson_id: string }[] }),
    quizIds.length
      ? db.from("quiz_attempts").select("quiz_id").eq("student_id", userId).eq("passed", true).in("quiz_id", quizIds)
      : Promise.resolve({ data: [] as { quiz_id: string }[] }),
    // The student's level (from the placement test), looked up every time so units published later at that level take over.
    db.from("enrollments").select("levels!enrollments_current_level_id_fkey(position)").eq("student_id", userId).eq("path_id", pathId).maybeSingle(),
  ]);
  const completedLessonIds = new Set((progress ?? []).map((p) => p.lesson_id));
  const passedQuizIds = new Set((attempts ?? []).map((a) => a.quiz_id));
  const levelPosition = enrollment?.levels?.position ?? 0;
  const startUnitId =
    [...units].sort((a, b) => a.levelPosition - b.levelPosition || a.position - b.position).find((u) => u.levelPosition >= levelPosition)?.id ?? null;

  return {
    levels: (levels ?? []).map(({ id, code, title, position }) => ({ id, code, title, position })),
    units: buildCurriculum(units, { completedLessonIds, passedQuizIds, startUnitId }),
    completedLessonIds,
    passedQuizIds,
  };
}

/** The student's point rows. */
export async function fetchXpRows(db: Db, userId: string): Promise<{ kind: string; points: number; created_at: string }[]> {
  const { data } = await db.from("xp_events").select("kind, points, created_at").eq("student_id", userId).limit(10_000);
  return data ?? [];
}

/** Words of every unit in which the student completed at least one lesson, on their path. */
export async function fetchLearnedWords(db: Db, userId: string, pathId: string): Promise<DeckWord[]> {
  const { data: progress } = await db.from("lesson_progress").select("lessons(unit_id)").eq("student_id", userId).eq("status", "completed");
  const unitIds = [...new Set((progress ?? []).map((p) => p.lessons?.unit_id).filter((id): id is string => Boolean(id)))];
  if (!unitIds.length) return [];
  const { data: items } = await db
    .from("vocab_items")
    .select("id, word, ipa, part_of_speech, meaning_ar, example_en, example_ar, position, units!inner(position, levels!inner(position, path_id))")
    .in("unit_id", unitIds)
    .eq("archived", false)
    .eq("units.levels.path_id", pathId);
  return (items ?? []).map((v) => ({
    id: v.id,
    word: v.word,
    ipa: v.ipa,
    partOfSpeech: v.part_of_speech,
    meaningAr: v.meaning_ar,
    exampleEn: v.example_en,
    exampleAr: v.example_ar,
    order: v.units.levels.position * 1_000_000 + v.units.position * 1_000 + v.position,
  }));
}

/** Today's vocabulary review deck (due words first, then a few new ones). */
export async function fetchVocabDeck(db: Db, userId: string, pathId: string): Promise<Deck> {
  const words = await fetchLearnedWords(db, userId, pathId);
  if (!words.length) return buildDeck([], [], new Date());
  const { data: rows } = await db
    .from("vocab_reviews")
    .select("vocab_item_id, due_at, ease, interval_days, repetitions, lapses")
    .eq("student_id", userId)
    .in(
      "vocab_item_id",
      words.map((w) => w.id),
    );
  const reviews: DeckReview[] = (rows ?? []).map((r) => ({
    vocabItemId: r.vocab_item_id,
    dueAt: r.due_at,
    ease: Number(r.ease),
    intervalDays: r.interval_days,
    repetitions: r.repetitions,
    lapses: r.lapses,
  }));
  return buildDeck(words, reviews, new Date());
}

/** Study days (lessons, quizzes, vocab reviews) for the streak. */
export async function fetchActivityDates(db: Db, userId: string): Promise<string[]> {
  const [lessons, quizzes, vocab] = await Promise.all([
    db.from("lesson_progress").select("completed_at").eq("student_id", userId).eq("status", "completed"),
    db.from("quiz_attempts").select("created_at").eq("student_id", userId),
    db.from("vocab_reviews").select("last_reviewed_at").eq("student_id", userId),
  ]);
  return [
    ...(lessons.data ?? []).map((r) => r.completed_at),
    ...(quizzes.data ?? []).map((r) => r.created_at),
    ...(vocab.data ?? []).map((r) => r.last_reviewed_at),
  ].filter((d): d is string => Boolean(d));
}
