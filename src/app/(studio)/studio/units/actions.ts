"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin, requireStaff } from "@/lib/auth/session";
import { dbErrorMessage } from "@/lib/auth/errors";
import { createClient } from "@/lib/supabase/server";
import { validateUnitPackage } from "@/lib/content/validate";
import { assembleUnit } from "@/lib/factory/build/generate";
import { CONTENT_SCHEMAS, textToSection, type WrittenBlock } from "@/lib/factory/build/content";
import { toVideoBlock } from "@/lib/factory/build/video";
import { gateOne } from "@/lib/factory/build/qa";
import { queueNextUnit } from "@/lib/factory/queue";
import type { FactoryOutput } from "@/lib/agent/factory";
import type { AdminFormState } from "@/app/(admin)/admin/actions";

const uuid = z.string().uuid();

/** The unit (curriculum row) with its current build job and output. */
async function load(id: string) {
  const supabase = await createClient();
  const { data: unit } = await supabase.from("curriculum_units").select("id, level_id, code, build_job_id, build_status").eq("id", id).single();
  if (!unit?.build_job_id) return { supabase, unit: null, job: null };
  const { data: job } = await supabase.from("agent_jobs").select("id, path_id, status, output").eq("id", unit.build_job_id).single();
  return { supabase, unit, job };
}

/** Re-assembles the package after an edit (exercises and quiz follow the new text) and re-runs gate 1. */
function reassemble(out: FactoryOutput): FactoryOutput {
  const pkg = assembleUnit({
    ...out.factory.assembly,
    roleplay: out.factory.roleplay ?? undefined,
    lessons: out.factory.lessons.map((l) => ({
      template: l.spec,
      templateKey: l.template,
      title_ar: l.title_ar,
      sections: l.sections,
      video: l.video ? toVideoBlock(l.video) : { type: "video", optional: false },
    })),
  });
  const v = validateUnitPackage(pkg);
  const issues = gateOne({ pkg, words: out.factory.assembly.words, known: out.factory.known, quizMin: out.factory.assembly.quiz.min, schemaErrors: v.errors });
  out.factory.lessons.forEach((l, i) => {
    if (!l.video) issues.unshift({ severity: "error", lesson: i + 1, message: "لم يُعثر على فيديو مناسب: اختر فيديو للدرس" });
  });
  return { package: pkg, factory: { ...out.factory, qa: { ...out.factory.qa, issues } } };
}

/** A reviewer's correction of one section (teacher or admin). */
export async function saveSection(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireStaff();
  const id = uuid.safeParse(formData.get("unit_id"));
  const lessonKey = String(formData.get("lesson_key") ?? "");
  const sectionKey = String(formData.get("section_key") ?? "");
  const block = String(formData.get("block") ?? "") as WrittenBlock;
  if (!id.success || !(block in CONTENT_SCHEMAS)) return { error: "بيانات غير صالحة." };
  const parsed = textToSection(block, String(formData.get("text") ?? ""));
  if (!parsed.ok) return { error: parsed.error };
  const { supabase, job } = await load(id.data);
  if (!job || job.status !== "needs_review") return { error: "هذه الوحدة ليست في المراجعة الآن." };
  const out = job.output as unknown as FactoryOutput;
  const lesson = out.factory.lessons.find((l) => l.key === lessonKey);
  if (!lesson) return { error: "الدرس غير موجود." };
  lesson.sections[sectionKey] = parsed.value;
  const next = reassemble(out);
  const { error } = await supabase
    .from("agent_jobs")
    .update({ output: next as never })
    .eq("id", job.id);
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath(`/studio/units/${id.data}`);
  return { ok: true, message: "حُفظ التعديل، وأعيد توليد التمارين والفحص." };
}

/** Asks the factory to rebuild ONE lesson with a note (and, optionally, another video). */
export async function rebuildLesson(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireStaff();
  const id = uuid.safeParse(formData.get("unit_id"));
  const lessonKey = String(formData.get("lesson_key") ?? "");
  const note = String(formData.get("note") ?? "")
    .trim()
    .slice(0, 1000);
  const link = String(formData.get("video") ?? "").trim();
  const videoId = link ? (/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/.exec(link)?.[1] ?? (/^[A-Za-z0-9_-]{11}$/.test(link) ? link : null)) : null;
  if (!id.success || !lessonKey) return { error: "بيانات غير صالحة." };
  if (link && !videoId) return { error: "رابط يوتيوب غير صحيح." };
  if (!note && !videoId) return { error: "اكتب ماذا يغيّر الوكيل، أو الصق رابط فيديو آخر." };
  const { supabase, unit, job } = await load(id.data);
  if (!unit || !job || job.status !== "needs_review") return { error: "هذه الوحدة ليست في المراجعة الآن." };
  const { data: lvl } = await supabase.from("levels").select("path_id").eq("id", unit.level_id).single();
  if (note && lvl) await supabase.from("agent_memory").insert({ path_id: lvl.path_id, text: `${unit.code}: ${note}`, source: "review" });
  const { data: again, error } = await supabase
    .from("agent_jobs")
    .insert({
      kind: "factory_lesson",
      path_id: job.path_id,
      input: {
        curriculum_unit_id: unit.id,
        unit_code: unit.code,
        base_job_id: job.id,
        lesson_key: lessonKey,
        ...(note ? { feedback: note } : {}),
        ...(videoId ? { video_id: videoId } : {}),
      },
    })
    .select("id")
    .single();
  if (error || !again) return { error: error ? dbErrorMessage(error) : "تعذر الإرسال." };
  await supabase.from("curriculum_units").update({ build_status: "building", build_job_id: again.id }).eq("id", unit.id);
  revalidatePath(`/studio/units/${id.data}`);
  return { ok: true, message: "أُرسل الدرس لإعادة البناء. يعود للمراجعة خلال ساعة تقريباً." };
}

export async function markUnitReviewed(formData: FormData): Promise<void> {
  const { userId } = await requireStaff();
  const id = uuid.safeParse(formData.get("unit_id"));
  if (!id.success) return;
  const supabase = await createClient();
  await supabase.from("curriculum_units").update({ teacher_ok_by: userId, teacher_ok_at: new Date().toISOString() }).eq("id", id.data);
  revalidatePath(`/studio/units/${id.data}`);
}

/** The owner publishes the unit to students; the factory then starts the next unit. */
export async function publishBuiltUnit(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireAdmin();
  const id = uuid.safeParse(formData.get("unit_id"));
  if (!id.success) return { error: "بيانات غير صالحة." };
  const { supabase, unit, job } = await load(id.data);
  if (!unit || !job || job.status !== "needs_review") return { error: "هذه الوحدة ليست في المراجعة الآن." };
  const out = job.output as unknown as FactoryOutput;
  if (out.factory.qa.issues.some((i) => i.severity === "error")) return { error: "في الوحدة ملاحظات حمراء يجب إصلاحها قبل النشر." };
  // A rebuilt unit (or an old unit with the same code) becomes the next version of that unit.
  const { data: existing } = await supabase.from("units").select("version").eq("code", out.package.code).maybeSingle();
  const pkg = { ...out.package, version: (existing?.version ?? 0) + 1 };
  const { data: unitId, error } = await supabase.rpc("import_unit_package", { p_package: pkg as never });
  if (error || !unitId) return { error: error ? dbErrorMessage(error) : "تعذر الاستيراد." };
  await supabase.from("lessons").update({ review_status: "approved", review_note: null }).eq("unit_id", unitId);
  const { error: pubError } = await supabase.rpc("publish_unit", { p_unit_id: unitId });
  if (pubError) return { error: dbErrorMessage(pubError) };
  await supabase.from("agent_jobs").update({ status: "approved" }).eq("id", job.id);
  await supabase.from("curriculum_units").update({ build_status: "approved", unit_id: unitId }).eq("id", unit.id);
  const next = await queueNextUnit(supabase, unit.level_id);
  revalidatePath("/studio", "layout");
  revalidatePath("/", "layout");
  return { ok: true, message: next ? `نُشرت ${unit.code} للطلاب، وبدأ المصنع ببناء ${next}.` : `نُشرت ${unit.code} للطلاب.` };
}

/** The owner rejects the whole unit: it is rebuilt from scratch with the note (kept as a rule). */
export async function rejectBuiltUnit(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireAdmin();
  const id = uuid.safeParse(formData.get("unit_id"));
  const note = String(formData.get("note") ?? "")
    .trim()
    .slice(0, 1000);
  if (!id.success || note.length < 5) return { error: "اكتب ملاحظتك ليعرف الوكيل ماذا يغيّر." };
  const { supabase, unit, job } = await load(id.data);
  if (!unit || !job) return { error: "الوحدة غير موجودة." };
  if (job.status === "needs_review") await supabase.from("agent_jobs").update({ status: "rejected", review_note: note }).eq("id", job.id);
  await supabase.from("agent_memory").insert({ path_id: job.path_id, text: `${unit.code}: ${note}`, source: "review" });
  const { data: again } = await supabase
    .from("agent_jobs")
    .insert({ kind: "factory_unit", path_id: job.path_id, input: { curriculum_unit_id: unit.id, unit_code: unit.code, feedback: note } })
    .select("id")
    .single();
  await supabase
    .from("curriculum_units")
    .update({ build_status: "building", build_job_id: again?.id ?? null, teacher_ok_by: null, teacher_ok_at: null })
    .eq("id", unit.id);
  revalidatePath(`/studio/units/${id.data}`);
  return { ok: true, message: "أُرسلت الوحدة لإعادة البناء بملاحظتك." };
}

/** Starts (or retries) the next unit of a level by hand. */
export async function buildNextUnit(formData: FormData): Promise<void> {
  await requireAdmin();
  const levelId = uuid.safeParse(formData.get("level_id"));
  if (!levelId.success) return;
  const supabase = await createClient();
  await queueNextUnit(supabase, levelId.data);
  revalidatePath(`/studio/levels/${levelId.data}`);
}

/** The owner sends a published unit back to the factory with the weekly analysis as its note. */
export async function improveUnit(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireAdmin();
  const unitId = uuid.safeParse(formData.get("unit_id"));
  const note = String(formData.get("note") ?? "")
    .trim()
    .slice(0, 1000);
  if (!unitId.success || note.length < 5) return { error: "لا توجد ملاحظات لإرسالها." };
  const supabase = await createClient();
  const { data: cu } = await supabase.from("curriculum_units").select("id, code, level_id, build_status").eq("unit_id", unitId.data).maybeSingle();
  if (!cu) return { error: "هذه الوحدة لم يبنها المصنع (وحدة قديمة)، فلا يعيد بناءها." };
  const { data: busy } = await supabase.from("curriculum_units").select("code").eq("level_id", cu.level_id).in("build_status", ["building", "review"]).limit(1);
  if (busy?.length) return { error: `المصنع مشغول بالوحدة ${busy[0].code}. أنهِ مراجعتها أولاً.` };
  const { data: lvl } = await supabase.from("levels").select("path_id").eq("id", cu.level_id).single();
  if (!lvl) return { error: "المستوى غير موجود." };
  const { data: job, error } = await supabase
    .from("agent_jobs")
    .insert({ kind: "factory_unit", path_id: lvl.path_id, input: { curriculum_unit_id: cu.id, unit_code: cu.code, feedback: note } })
    .select("id")
    .single();
  if (error || !job) return { error: error ? dbErrorMessage(error) : "تعذر الإرسال." };
  await supabase.from("curriculum_units").update({ build_status: "building", build_job_id: job.id, teacher_ok_by: null, teacher_ok_at: null }).eq("id", cu.id);
  revalidatePath("/studio", "layout");
  return { ok: true, message: `يعيد المصنع بناء ${cu.code} بهذه الملاحظات. النسخة المنشورة تبقى للطلاب حتى تنشر الجديدة.` };
}
