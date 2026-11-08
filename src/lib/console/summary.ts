import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { noticesFor, STEP_AR, type AgentState, type ConsoleSummary } from "./notices";

export type { AgentState, ConsoleNotice, ConsoleSummary, NoticeIcon } from "./notices";
export { reviewCount } from "./notices";

const JOB_LABEL: Record<string, string> = {
  plan_path: "تصميم مسار",
  plan_level: "رسم خريطة مستوى",
  factory_unit: "بناء وحدة",
  factory_lesson: "إعادة بناء درس",
  improve_unit: "تحسين وحدة",
  build_unit: "بناء وحدة",
};

/** What needs a decision now; shared by the sidebar badges, the bell and the home page. */
/** Cached per request, so the frame and the page share one read. */
export const loadConsoleSummary = cache(async (isAdmin: boolean): Promise<ConsoleSummary> => {
  const supabase = await createClient();
  const dayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const [units, maps, running, failed, paused, apps, reports, errors, broken] = await Promise.all([
    supabase.from("curriculum_units").select("id, code, title_en, title_ar, teacher_ok_at, unit_id").eq("build_status", "review").order("code"),
    supabase.from("curriculum_levels").select("level_id, teacher_ok_at").eq("status", "review"),
    supabase.from("agent_jobs").select("kind, step, progress, input").eq("status", "running").order("started_at", { ascending: false }).limit(1),
    // The latest finished job: a failure shows only until a later job succeeds (and for a day at most).
    supabase
      .from("agent_jobs")
      .select("kind, status, error, input, finished_at")
      .not("finished_at", "is", null)
      .gte("finished_at", dayAgo)
      .order("finished_at", { ascending: false })
      .limit(1),
    isAdmin ? supabase.from("settings").select("value").eq("key", "agent_paused").maybeSingle() : Promise.resolve({ data: null }),
    isAdmin ? supabase.from("applications").select("id", { count: "exact", head: true }).eq("status", "submitted") : Promise.resolve({ count: 0 }),
    isAdmin ? supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "open") : Promise.resolve({ count: 0 }),
    isAdmin ? supabase.from("app_errors").select("id", { count: "exact", head: true }).eq("status", "open") : Promise.resolve({ count: 0 }),
    isAdmin ? supabase.from("sources").select("youtube_id", { count: "exact", head: true }).eq("status", "broken") : Promise.resolve({ count: 0 }),
  ]);

  const reviewUnits = (units.data ?? []).map((u) => ({ id: u.id, code: u.code, title: u.title_ar || u.title_en, teacherOk: !!u.teacher_ok_at }));
  const mapIds = (maps.data ?? []).map((m) => m.level_id);
  const { data: mapLevels } = mapIds.length
    ? await supabase.from("levels").select("id, code").in("id", mapIds)
    : { data: [] as { id: string; code: string }[] };
  const levelCode = new Map((mapLevels ?? []).map((l) => [l.id, l.code]));
  const mapsInReview = (maps.data ?? []).map((m) => ({ levelId: m.level_id, code: levelCode.get(m.level_id) ?? "", teacherOk: !!m.teacher_ok_at }));

  const codeOf = (input: unknown) => {
    const i = (input ?? {}) as Record<string, unknown>;
    return typeof i.unit_code === "string" ? i.unit_code : typeof i.level_code === "string" ? i.level_code : "";
  };
  const run = running.data?.[0];
  const last = failed.data?.[0];
  const fail = last?.status === "failed" ? last : undefined;
  const agent: AgentState =
    isAdmin && paused.data?.value === true
      ? { kind: "paused" }
      : run
        ? {
            kind: "running",
            label: `${JOB_LABEL[run.kind] ?? run.kind} ${codeOf(run.input)}`.trim(),
            step: run.step ? (STEP_AR[run.step] ?? null) : null,
            progress: run.progress,
          }
        : fail
          ? { kind: "failed", label: `${JOB_LABEL[fail.kind] ?? fail.kind} ${codeOf(fail.input)}`.trim(), error: fail.error, at: fail.finished_at ?? "" }
          : { kind: "idle" };

  const summary: ConsoleSummary = {
    isAdmin,
    pendingApplications: apps.count ?? 0,
    openReports: reports.count ?? 0,
    openErrors: errors.count ?? 0,
    brokenVideos: broken.count ?? 0,
    unitsForTeacher: reviewUnits.filter((u) => !u.teacherOk),
    unitsForAdmin: reviewUnits,
    mapsInReview,
    agent,
    notices: [],
  };
  summary.notices = noticesFor(summary);
  return summary;
});
