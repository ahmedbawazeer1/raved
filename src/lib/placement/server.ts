import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  computeResult,
  LEVELS,
  monthsToB2,
  SKILLS,
  type BankQuestion,
  type Level,
  type PlacementState,
  type Skill,
} from "./engine";

/** What the browser gets for one placement question: never the answer. */
export interface PlacementQuestionView {
  id: string;
  skill: Skill;
  prompt: string;
  text: string | null;
  listen: string | null;
  options: string[];
}

export interface LoadedBank {
  questions: BankQuestion[];
  views: Map<string, PlacementQuestionView>;
  answers: Map<string, number>;
}

/** The bank is admin-only in the database, so it is read here with the service key. */
export async function loadBank(pathId: string): Promise<LoadedBank> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("placement_questions")
    .select("id, level, skill, position, item, answer")
    .eq("path_id", pathId)
    .eq("archived", false);
  if (error) throw error;

  const bank: LoadedBank = { questions: [], views: new Map(), answers: new Map() };
  for (const row of data) {
    if (!(LEVELS as readonly string[]).includes(row.level) || !(SKILLS as readonly string[]).includes(row.skill)) continue;
    const item = (row.item ?? {}) as { prompt?: string; text?: string; listen?: string; options?: string[] };
    bank.questions.push({ id: row.id, level: row.level as Level, skill: row.skill as Skill, position: row.position });
    bank.views.set(row.id, {
      id: row.id,
      skill: row.skill as Skill,
      prompt: item.prompt ?? "",
      text: item.text ?? null,
      listen: item.listen ?? null,
      options: item.options ?? [],
    });
    bank.answers.set(row.id, row.answer);
  }
  return bank;
}

export function parseState(value: unknown): PlacementState | null {
  const s = value as PlacementState | null;
  return s && typeof s === "object" && Array.isArray(s.answers) && typeof s.level === "string" ? s : null;
}

/**
 * Finishes an attempt: result, starting unit, time estimate, skill estimates and the
 * enrollment's starting point. Runs with the service key after the caller was checked.
 */
export async function finishAttempt(attemptId: string, studentId: string, pathId: string, state: PlacementState, dailyMinutes: number) {
  const admin = createAdminClient();
  const result = computeResult(state.answers);

  const { data: levels } = await admin
    .from("levels")
    .select("id, code, position, est_hours, units(id, position, status)")
    .eq("path_id", pathId)
    .eq("kind", "general")
    .order("position");
  const general = levels ?? [];
  const overallLevel = general.find((l) => l.code === result.overall);
  // First published unit at the placed level, else the next published one after it.
  const startUnit =
    general
      .filter((l) => l.position >= (overallLevel?.position ?? 0))
      .flatMap((l) => (l.units ?? []).filter((u) => u.status === "published").sort((a, b) => a.position - b.position))[0] ?? null;
  const hours = Object.fromEntries(general.map((l) => [l.code, l.est_hours ?? 0])) as Partial<Record<Level, number>>;
  const eta = monthsToB2(result.overall, hours, dailyMinutes);

  const skillLevels = Object.fromEntries(SKILLS.map((s) => [s, { level: result.skills[s], percent: result.skillPercent[s] }]));

  const { error } = await admin
    .from("placement_attempts")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      state: state as never,
      overall_level: result.overall,
      skill_levels: skillLevels,
      start_unit_id: startUnit?.id ?? null,
      eta_months: eta,
    })
    .eq("id", attemptId)
    .eq("student_id", studentId);
  if (error) throw error;

  await admin.from("skill_estimates").upsert(
    SKILLS.map((skill) => ({ student_id: studentId, path_id: pathId, skill, level: result.skills[skill], source: "placement" })),
    { onConflict: "student_id,path_id,skill" },
  );
  await admin
    .from("enrollments")
    .update({ ...(overallLevel ? { current_level_id: overallLevel.id } : {}), start_unit_id: startUnit?.id ?? null })
    .eq("student_id", studentId)
    .eq("path_id", pathId);
}
