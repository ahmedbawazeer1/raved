"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { dbErrorMessage } from "@/lib/auth/errors";
import { createClient } from "@/lib/supabase/server";
import type { AdminFormState } from "../actions";

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
  const { data: job, error } = await supabase
    .from("agent_jobs")
    .update({ status: decision, review_note: note || null })
    .eq("id", job_id)
    .select("id, kind, path_id, input")
    .single();
  if (error) return { error: dbErrorMessage(error) };

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
