"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { dbErrorMessage } from "@/lib/auth/errors";
import { createClient } from "@/lib/supabase/server";
import { pathPlanSchema, type PathPlan } from "@/lib/agent/plan";
import type { AdminFormState } from "../actions";

type Db = Awaited<ReturnType<typeof createClient>>;

/** Queues one build job per unit of a plan level (the units before each one are its context). */
async function queueLevel(supabase: Db, pathId: string, pathSlug: string, plan: PathPlan, levelIndex: number, planJob: string) {
  const level = plan.levels[levelIndex];
  if (!level) return 0;
  const rows = level.units.map((unit, i) => ({
    kind: "build_unit",
    path_id: pathId,
    input: {
      path_slug: pathSlug,
      level: level.code,
      level_index: levelIndex,
      position: i + 1,
      unit,
      previous: level.units.slice(0, i).map((u) => u.title_en),
      plan_job: planJob,
    },
  }));
  await supabase.from("agent_jobs").insert(rows);
  return rows.length;
}

/** Makes sure every level of the approved plan exists, in the plan's order. */
async function ensureLevels(supabase: Db, pathId: string, plan: PathPlan) {
  const { data: existing } = await supabase.from("levels").select("code, position").eq("path_id", pathId);
  const have = new Set((existing ?? []).map((l) => l.code));
  let position = Math.max(0, ...(existing ?? []).map((l) => l.position));
  for (const level of plan.levels) {
    if (have.has(level.code)) {
      await supabase.from("levels").update({ planned_units: level.units.length }).eq("path_id", pathId).eq("code", level.code);
      continue;
    }
    position += 1;
    await supabase
      .from("levels")
      .insert({ path_id: pathId, code: level.code, title: level.title_ar, description: level.goal_ar, position, planned_units: level.units.length });
  }
}

/** Adds an approved unit to the platform: import, approve its lessons and publish. */
async function publishBuiltUnit(supabase: Db, pkg: unknown): Promise<string | null> {
  const { data: unitId, error } = await supabase.rpc("import_unit_package", { p_package: pkg as never });
  if (error) return error.message === "unknown_level" ? "المستوى غير موجود في المسار." : dbErrorMessage(error);
  await supabase.from("lessons").update({ review_status: "approved", review_note: null }).eq("unit_id", unitId);
  const { error: publishError } = await supabase.rpc("publish_unit", { p_unit_id: unitId });
  return publishError ? dbErrorMessage(publishError) : null;
}

/** Queues a new path plan for «عقل رفد». */
export async function queuePlan(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireAdmin();
  const pathId = z.string().uuid().safeParse(formData.get("path_id"));
  if (!pathId.success) return { error: "اختر المسار." };
  const supabase = await createClient();
  const { data: busy } = await supabase.from("agent_jobs").select("id").eq("path_id", pathId.data).in("status", ["queued", "running"]).limit(1);
  if (busy?.length) return { error: "الوكيل يعمل على هذا المسار الآن. انتظر حتى ينتهي." };
  const { data, error } = await supabase.from("agent_jobs").insert({ kind: "plan_path", path_id: pathId.data }).select("id").single();
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath("/admin/agent");
  redirect(`/admin/agent/${data.id}`);
}

/**
 * The owner's decision on a finished job. A rejection keeps the note as a rule in the agent's
 * memory and queues a new version that follows it.
 */
export async function reviewJob(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireAdmin();
  const parsed = z
    .object({ job_id: z.string().uuid(), decision: z.enum(["approved", "rejected"]), note: z.string().trim().max(1000).optional() })
    .safeParse({ job_id: formData.get("job_id"), decision: formData.get("decision"), note: formData.get("note") ?? undefined });
  if (!parsed.success) return { error: "قرار غير صالح." };
  const { job_id, decision, note } = parsed.data;
  if (decision === "rejected" && (!note || note.length < 3)) return { error: "اكتب ملاحظتك ليعرف الوكيل ماذا يغيّر." };

  const supabase = await createClient();
  const { data: kindRow } = await supabase.from("agent_jobs").select("kind").eq("id", job_id).single();
  if (kindRow && ["plan_level", "factory_unit", "factory_lesson"].includes(kindRow.kind)) return { error: "تُراجع هذه المهمة من «استوديو المحتوى»." };
  const { data: job, error } = await supabase
    .from("agent_jobs")
    .update({ status: decision, review_note: note || null })
    .eq("id", job_id)
    .select("id, kind, path_id, input, output")
    .single();
  if (error) return { error: dbErrorMessage(error) };

  if (decision === "approved" && job.kind === "plan_path") {
    const plan = pathPlanSchema.safeParse(job.output);
    const { data: path } = await supabase.from("paths").select("slug").eq("id", job.path_id).single();
    if (plan.success && path) {
      await ensureLevels(supabase, job.path_id, plan.data);
      const n = await queueLevel(supabase, job.path_id, path.slug, plan.data, 0, job.id);
      revalidatePath("/admin/agent");
      return { ok: true, message: `اعتمدت الخطة. بدأ الوكيل ببناء ${n} وحدة من المستوى الأول، وستصلك واحدة واحدة للمراجعة.` };
    }
  }
  if (decision === "approved" && (job.kind === "build_unit" || job.kind === "improve_unit")) {
    const out = job.output as { package?: unknown } | null;
    const problem = out?.package ? await publishBuiltUnit(supabase, out.package) : "لا توجد وحدة في النتيجة.";
    if (problem) return { error: `اعتُمدت، لكن تعذر نشرها: ${problem}` };
    // When the whole level is approved, the agent moves on to the next level of the plan.
    const input = job.input as { plan_job?: string; level_index?: number };
    if (input.plan_job && typeof input.level_index === "number") {
      const { data: open } = await supabase
        .from("agent_jobs")
        .select("id")
        .eq("kind", "build_unit")
        .contains("input", { plan_job: input.plan_job, level_index: input.level_index })
        .in("status", ["queued", "running", "needs_review", "failed"])
        .limit(1);
      const { data: planJob } = await supabase.from("agent_jobs").select("output").eq("id", input.plan_job).single();
      const plan = pathPlanSchema.safeParse(planJob?.output);
      const { data: path } = await supabase.from("paths").select("slug").eq("id", job.path_id).single();
      if (!open?.length && plan.success && path) await queueLevel(supabase, job.path_id, path.slug, plan.data, input.level_index + 1, input.plan_job);
    }
    revalidatePath("/admin/agent");
    revalidatePath("/", "layout");
    return { ok: true, message: "اعتمدت الوحدة ونُشرت للطلاب." };
  }

  if (decision === "rejected" && note) {
    await supabase.from("agent_memory").insert({ path_id: job.path_id, text: note, source: "review", job_id: job.id });
    const { data: again } = await supabase
      .from("agent_jobs")
      .insert({ kind: job.kind, path_id: job.path_id, input: { ...(job.input as Record<string, unknown>), feedback: note, previous_job: job.id } })
      .select("id")
      .single();
    revalidatePath("/admin/agent");
    if (again) redirect(`/admin/agent/${again.id}`);
  }
  revalidatePath("/admin/agent");
  revalidatePath(`/admin/agent/${job_id}`);
  return { ok: true, message: decision === "approved" ? "اعتمدت. سيبني الوكيل الوحدات من هذه الخطة." : "أُرسلت ملاحظتك." };
}

/** Adds a rule the agent must always follow. */
export async function addRule(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireAdmin();
  const text = String(formData.get("text") ?? "").trim();
  const pathId = String(formData.get("path_id") ?? "") || null;
  if (text.length < 3) return { error: "اكتب القاعدة." };
  const supabase = await createClient();
  const { error } = await supabase.from("agent_memory").insert({ text: text.slice(0, 1000), path_id: pathId, source: "manual" });
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath("/admin/agent");
  return { ok: true, message: "أضيفت القاعدة." };
}

export async function toggleRule(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "true";
  const supabase = await createClient();
  await supabase.from("agent_memory").update({ active }).eq("id", id);
  revalidatePath("/admin/agent");
}

/** Queues the same job again (after a failure, e.g. a missing key or a busy service). */
export async function retryJob(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = z.string().uuid().safeParse(formData.get("job_id"));
  if (!id.success) return;
  const supabase = await createClient();
  const { data: job } = await supabase.from("agent_jobs").select("kind, path_id, input, status").eq("id", id.data).single();
  if (!job || job.status !== "failed") return;
  const { data } = await supabase.from("agent_jobs").insert({ kind: job.kind, path_id: job.path_id, input: job.input }).select("id").single();
  revalidatePath("/admin/agent");
  if (data) redirect(`/admin/agent/${data.id}`);
}

/** «أوقف الوكيل / شغّله»: the runner checks this before every job and every model call. */
export async function setAgentPaused(formData: FormData): Promise<void> {
  const { userId } = await requireAdmin();
  const paused = formData.get("paused") === "1";
  const supabase = await createClient();
  await supabase.from("settings").upsert({ key: "agent_paused", value: paused });
  await supabase.from("audit_log").insert({ actor_id: userId, action: paused ? "agent.pause" : "agent.resume", target: null, data: {} });
  revalidatePath("/admin/agent");
}
