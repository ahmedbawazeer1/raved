"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin, requireStaff } from "@/lib/auth/session";
import { dbErrorMessage } from "@/lib/auth/errors";
import { createClient } from "@/lib/supabase/server";
import { blocking, mapWordSchema, WORD, wordCode } from "@/lib/factory/curriculum";
import { refreshIssues } from "@/lib/factory/load";
import { queueNextUnit } from "@/lib/factory/queue";
import { channelFromUrl, DEFAULT_PROFILE, FRAMEWORKS, LANGUAGES, parseProfile, pathProfileSchema, playlistFromUrl } from "@/lib/factory/profile";
import { DEFAULT_TEMPLATES, lessonTemplateSpec, templateErrors, unitTemplateSpec } from "@/lib/factory/templates";
import type { AdminFormState } from "@/app/(admin)/admin/actions";

const uuid = z.string().uuid();

function lockedMessage(message: string): string {
  if (message.includes("map_locked")) return "الخريطة معتمدة ومقفلة. يعدّلها المدير فقط.";
  if (message.includes("admins_only")) return "هذه الخطوة للمدير فقط.";
  return dbErrorMessage({ message } as never);
}

// ---------------------------------------------------------------------------
// Path profile
// ---------------------------------------------------------------------------

/** One level's settings in the path profile (framework, video language, unit template, ordering playlist). */
export async function saveLevelProfile(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const { userId } = await requireAdmin();
  const pathId = uuid.safeParse(formData.get("path_id"));
  const code = String(formData.get("code") ?? "");
  if (!pathId.success || !code) return { error: "بيانات غير صالحة." };
  const playlistRaw = String(formData.get("source_playlist") ?? "").trim();
  const playlist = playlistRaw ? playlistFromUrl(playlistRaw) : null;
  if (playlistRaw && !playlist) return { error: "رابط قائمة التشغيل غير صحيح. انسخه من يوتيوب (فيه list=)." };
  const level = {
    code,
    framework: z.enum(FRAMEWORKS).catch("custom").parse(formData.get("framework")),
    video_language: z.enum(LANGUAGES).catch("ar").parse(formData.get("video_language")),
    unit_template: String(formData.get("unit_template") ?? "standard"),
    ...(playlist ? { source_playlist: playlist } : {}),
    ...(String(formData.get("notes_ar") ?? "").trim() ? { notes_ar: String(formData.get("notes_ar")).trim().slice(0, 600) } : {}),
  };
  const supabase = await createClient();
  const { data } = await supabase.from("path_profiles").select("profile").eq("path_id", pathId.data).maybeSingle();
  const profile = parseProfile(data?.profile);
  const levels = profile.levels.some((l) => l.code === code) ? profile.levels.map((l) => (l.code === code ? level : l)) : [...profile.levels, level];
  const next = pathProfileSchema.safeParse({ ...profile, levels });
  if (!next.success) return { error: "إعدادات غير صالحة." };
  const { error } = await supabase.from("path_profiles").upsert({ path_id: pathId.data, profile: next.data as never, updated_by: userId });
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath("/studio", "layout");
  return { ok: true, message: `حُفظت إعدادات ${code}.` };
}

/** Video rules and quality criteria of the path. */
export async function saveVideoRules(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const { userId } = await requireAdmin();
  const pathId = uuid.safeParse(formData.get("path_id"));
  if (!pathId.success) return { error: "بيانات غير صالحة." };
  const supabase = await createClient();
  const { data } = await supabase.from("path_profiles").select("profile").eq("path_id", pathId.data).maybeSingle();
  const profile = parseProfile(data?.profile);
  const criteria = String(formData.get("criteria") ?? "")
    .split("\n")
    .map((c) => c.trim())
    .filter(Boolean);
  const next = pathProfileSchema.safeParse({
    ...profile,
    video: {
      min_sec: Math.round(Number(formData.get("min_min")) * 60),
      max_sec: Math.round(Number(formData.get("max_min")) * 60),
      captions_required: formData.get("captions_required") === "on",
      candidates: Number(formData.get("candidates")),
    },
    quality: { criteria, min_score: Number(formData.get("min_score")) },
  });
  if (!next.success) return { error: `تحقق من القيم: ${next.error.issues[0]?.message ?? ""}` };
  const { error } = await supabase.from("path_profiles").upsert({ path_id: pathId.data, profile: next.data as never, updated_by: userId });
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath("/studio", "layout");
  return { ok: true, message: "حُفظت شروط الفيديو ومعايير الجودة." };
}

/** A trusted channel or playlist (teachers curate them). */
export async function addVideoSource(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireStaff();
  const pathId = uuid.safeParse(formData.get("path_id"));
  if (!pathId.success) return { error: "بيانات غير صالحة." };
  const link = String(formData.get("link") ?? "");
  const playlist = playlistFromUrl(link);
  const channel = playlist ? null : channelFromUrl(link);
  if (!playlist && !channel) return { error: "الصق رابط قناة يوتيوب (مثل youtube.com/@name) أو رابط قائمة تشغيل." };
  const title = String(formData.get("title") ?? "").trim();
  if (title.length < 2) return { error: "اكتب اسم القناة." };
  const levels = formData.getAll("levels").map(String).filter(Boolean);
  const supabase = await createClient();
  const { count } = await supabase.from("video_sources").select("id", { count: "exact", head: true }).eq("path_id", pathId.data);
  const { error } = await supabase.from("video_sources").insert({
    path_id: pathId.data,
    kind: playlist ? "playlist" : "channel",
    ref: (playlist ?? channel)!,
    title: title.slice(0, 120),
    language: z.enum(LANGUAGES).catch("ar").parse(formData.get("language")),
    levels,
    position: (count ?? 0) + 1,
    notes:
      String(formData.get("notes") ?? "")
        .trim()
        .slice(0, 300) || null,
  });
  if (error) return { error: error.code === "23505" ? "هذا المصدر مضاف من قبل." : dbErrorMessage(error) };
  revalidatePath("/studio", "layout");
  return { ok: true, message: "أضيف المصدر." };
}

export async function removeVideoSource(formData: FormData): Promise<void> {
  await requireStaff();
  const id = uuid.safeParse(formData.get("id"));
  if (!id.success) return;
  const supabase = await createClient();
  await supabase.from("video_sources").delete().eq("id", id.data);
  revalidatePath("/studio", "layout");
}

/** Moves a source up or down the search order. */
export async function moveVideoSource(formData: FormData): Promise<void> {
  await requireStaff();
  const id = uuid.safeParse(formData.get("id"));
  const dir = formData.get("dir") === "up" ? -1 : 1;
  if (!id.success) return;
  const supabase = await createClient();
  const { data: me } = await supabase.from("video_sources").select("path_id").eq("id", id.data).single();
  if (!me) return;
  const { data: all } = await supabase.from("video_sources").select("id, position").eq("path_id", me.path_id).order("position").order("created_at");
  const list = [...(all ?? [])];
  const i = list.findIndex((s) => s.id === id.data);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  await Promise.all(
    list.map((s, k) =>
      supabase
        .from("video_sources")
        .update({ position: k + 1 })
        .eq("id", s.id),
    ),
  );
  revalidatePath("/studio", "layout");
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

/** Saves a template (admin). The spec comes from the visual editor as JSON and is validated here. */
export async function saveTemplate(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const { userId } = await requireAdmin();
  const kind = z.enum(["lesson", "unit"]).safeParse(formData.get("kind"));
  const key = String(formData.get("key") ?? "");
  if (!kind.success || !/^[a-z][a-z0-9_]{1,40}$/.test(key)) return { error: "بيانات غير صالحة." };
  let spec: unknown;
  try {
    spec = JSON.parse(String(formData.get("spec") ?? ""));
  } catch {
    return { error: "تعذر قراءة القالب." };
  }
  const errors = templateErrors(kind.data, spec);
  if (errors.length) return { error: errors.join(" · ") };
  const title = String(formData.get("title_ar") ?? "").trim();
  const description = String(formData.get("description_ar") ?? "").trim();
  if (title.length < 2) return { error: "اكتب اسم القالب." };
  const supabase = await createClient();
  if (kind.data === "unit") {
    const { data: lessons } = await supabase.from("content_templates").select("key").eq("kind", "lesson");
    const have = new Set((lessons ?? []).map((l) => l.key));
    const missing = unitTemplateSpec.parse(spec).lessons.filter((l) => !have.has(l.template));
    if (missing.length) return { error: `قوالب دروس غير موجودة: ${missing.map((m) => m.template).join("، ")}` };
  }
  const { data: existing } = await supabase.from("content_templates").select("id, version").eq("kind", kind.data).eq("key", key).maybeSingle();
  const row = {
    kind: kind.data,
    key,
    title_ar: title.slice(0, 80),
    description_ar: description.slice(0, 600),
    spec: (kind.data === "lesson" ? lessonTemplateSpec.parse(spec) : unitTemplateSpec.parse(spec)) as never,
    updated_by: userId,
  };
  const { error } = existing
    ? await supabase
        .from("content_templates")
        .update({ ...row, version: existing.version + 1 })
        .eq("id", existing.id)
    : await supabase.from("content_templates").insert(row);
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath("/studio/templates", "layout");
  return { ok: true, message: "حُفظ القالب. يُطبَّق على ما يُبنى بعد الآن، ولا يغيّر المنشور." };
}

/** Puts back the shipped version of a default template. */
export async function resetTemplate(formData: FormData): Promise<void> {
  const { userId } = await requireAdmin();
  const key = String(formData.get("key") ?? "");
  const kind = String(formData.get("kind") ?? "");
  const def = DEFAULT_TEMPLATES.find((t) => t.key === key && t.kind === kind);
  if (!def) return;
  const supabase = await createClient();
  await supabase
    .from("content_templates")
    .update({ title_ar: def.title_ar, description_ar: def.description_ar, spec: def.spec as never, updated_by: userId })
    .eq("kind", def.kind)
    .eq("key", def.key);
  revalidatePath("/studio/templates", "layout");
}

// ---------------------------------------------------------------------------
// Level map
// ---------------------------------------------------------------------------

/** Asks «عقل رفد» to draft (or redraft) a level map. */
export async function planLevelMap(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireAdmin();
  const levelId = uuid.safeParse(formData.get("level_id"));
  if (!levelId.success) return { error: "بيانات غير صالحة." };
  const feedback = String(formData.get("feedback") ?? "")
    .trim()
    .slice(0, 1000);
  const supabase = await createClient();
  const { data: level } = await supabase.from("levels").select("id, code, path_id").eq("id", levelId.data).single();
  if (!level) return { error: "المستوى غير موجود." };
  const { data: current } = await supabase.from("curriculum_levels").select("status").eq("level_id", level.id).maybeSingle();
  if (current?.status === "approved") return { error: "خريطة هذا المستوى معتمدة. لا يُعاد تخطيطها بعد الاعتماد." };
  const { data: busy } = await supabase
    .from("agent_jobs")
    .select("id")
    .eq("kind", "plan_level")
    .contains("input", { level_id: level.id })
    .in("status", ["queued", "running"]);
  if (busy?.length) return { error: "الوكيل يخطط هذا المستوى الآن." };
  if (feedback) await supabase.from("agent_memory").insert({ path_id: level.path_id, text: `${level.code}: ${feedback}`, source: "review" });
  const { data: job, error } = await supabase
    .from("agent_jobs")
    .insert({ kind: "plan_level", path_id: level.path_id, input: { level_id: level.id, level_code: level.code, ...(feedback ? { feedback } : {}) } })
    .select("id")
    .single();
  if (error) return { error: dbErrorMessage(error) };
  await supabase.from("curriculum_levels").upsert({ level_id: level.id, status: "planning", job_id: job.id });
  const { data: paused } = await supabase.from("settings").select("value").eq("key", "agent_paused").maybeSingle();
  revalidatePath(`/studio/levels/${level.id}`);
  return {
    ok: true,
    message:
      paused?.value === true
        ? "أُضيفت المهمة، لكن «عقل رفد» موقوف الآن. شغّله من صفحة «عقل رفد» في الإدارة ليبدأ."
        : "بدأ «عقل رفد» تخطيط المستوى. يأخذ ذلك عادة أقل من ساعة (يعمل كل نصف ساعة).",
  };
}

const lineWords = (text: string) =>
  text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [word = "", meaning = "", example = "", pos = "other"] = l.split("|").map((p) => p.trim());
      return { word, meaning_ar: meaning, example_en: example, pos };
    });

/** Edits one unit of a draft map (teacher or admin). Words: one per line «word | المعنى | example | pos». */
export async function saveMapUnit(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireStaff();
  const id = uuid.safeParse(formData.get("id"));
  if (!id.success) return { error: "بيانات غير صالحة." };
  const supabase = await createClient();
  const { data: unit } = await supabase.from("curriculum_units").select("id, level_id, code").eq("id", id.data).single();
  if (!unit) return { error: "الوحدة غير موجودة." };
  const codes = (name: string) =>
    String(formData.get(name) ?? "")
      .split(/[\s,،]+/)
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean);
  const review = String(formData.get("review") ?? "")
    .split(/[,،\n]+/)
    .map((w) => w.trim())
    .filter(Boolean);
  if (review.some((w) => !WORD.test(w))) return { error: "كلمات المراجعة: كلمات إنجليزية فقط، تفصل بينها فاصلة." };
  const words = lineWords(String(formData.get("words") ?? ""));
  for (const [i, w] of words.entries()) {
    const r = mapWordSchema.safeParse({ ...w, pos: ["noun", "verb", "adjective", "adverb", "phrase", "other"].includes(w.pos) ? w.pos : "other" });
    if (!r.success) return { error: `الكلمة في السطر ${i + 1} غير مكتملة: اكتب «word | المعنى | example sentence»` };
  }
  const fields = {
    title_en: String(formData.get("title_en") ?? "").trim(),
    title_ar: String(formData.get("title_ar") ?? "").trim(),
    stop_ar: String(formData.get("stop_ar") ?? "").trim(),
    situation_ar: String(formData.get("situation_ar") ?? "").trim(),
    task_ar: String(formData.get("task_ar") ?? "").trim(),
    objectives: codes("objectives"),
    grammar: codes("grammar"),
    review_words: review,
  };
  const { error } = await supabase.from("curriculum_units").update(fields).eq("id", unit.id);
  if (error) return { error: lockedMessage(error.message) };
  const { error: delError } = await supabase.from("curriculum_items").delete().eq("level_id", unit.level_id).eq("kind", "word").eq("unit_code", unit.code);
  if (delError) return { error: lockedMessage(delError.message) };
  if (words.length) {
    const { error: insError } = await supabase.from("curriculum_items").upsert(
      words.map((w, i) => ({
        level_id: unit.level_id,
        kind: "word",
        code: wordCode(w.word),
        text_en: w.word,
        text_ar: w.meaning_ar,
        detail: { pos: w.pos, example_en: w.example_en },
        unit_code: unit.code,
        position: i + 1,
      })),
      { onConflict: "level_id,kind,code" },
    );
    if (insError) return { error: lockedMessage(insError.message) };
  }
  await refreshIssues(supabase, unit.level_id);
  revalidatePath(`/studio/levels/${unit.level_id}`);
  return { ok: true, message: `حُفظت ${unit.code} وأعيد الفحص.` };
}

/** The teacher marks the map reviewed (the owner is then asked to approve). */
export async function markMapReviewed(formData: FormData): Promise<void> {
  const { userId } = await requireStaff();
  const levelId = uuid.safeParse(formData.get("level_id"));
  if (!levelId.success) return;
  const supabase = await createClient();
  await supabase.from("curriculum_levels").update({ teacher_ok_by: userId, teacher_ok_at: new Date().toISOString() }).eq("level_id", levelId.data);
  revalidatePath(`/studio/levels/${levelId.data}`);
}

/** The owner approves the map: it is locked and the factory may build its units, one by one. */
export async function approveMap(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const { userId } = await requireAdmin();
  const levelId = uuid.safeParse(formData.get("level_id"));
  if (!levelId.success) return { error: "بيانات غير صالحة." };
  const supabase = await createClient();
  const issues = await refreshIssues(supabase, levelId.data);
  if (blocking(issues)) return { error: "في الخريطة ملاحظات حمراء يجب إصلاحها أولاً (انظر «الفحص الآلي»)." };
  const { data: cl } = await supabase.from("curriculum_levels").select("job_id").eq("level_id", levelId.data).maybeSingle();
  const { error } = await supabase
    .from("curriculum_levels")
    .update({ status: "approved", approved_by: userId, approved_at: new Date().toISOString() })
    .eq("level_id", levelId.data);
  if (error) return { error: lockedMessage(error.message) };
  if (cl?.job_id) await supabase.from("agent_jobs").update({ status: "approved" }).eq("id", cl.job_id);
  // The factory starts with the first unit; each next one starts when the previous is published.
  const first = await queueNextUnit(supabase, levelId.data);
  revalidatePath(`/studio/levels/${levelId.data}`);
  revalidatePath("/studio");
  return { ok: true, message: `اعتُمدت خريطة المستوى. ${first ? `بدأ المصنع ببناء ${first}، وستصلك وحدة وحدة للمراجعة.` : ""}` };
}

// ---------------------------------------------------------------------------
// New paths and levels, built entirely in the studio
// ---------------------------------------------------------------------------

/** A new path (hidden from students until the admin publishes it) with an empty path profile. */
export async function createPath(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const { userId } = await requireAdmin();
  const parsed = z
    .object({
      title: z.string().trim().min(2, "اكتب اسم المسار").max(120),
      slug: z
        .string()
        .trim()
        .toLowerCase()
        .regex(/^[a-z0-9][a-z0-9-]{1,40}$/, "الرابط: حروف إنجليزية صغيرة وأرقام وشرطة فقط، مثل web-dev"),
      summary: z.string().trim().max(300).default(""),
      icon: z.enum(["book", "code", "database", "pen"]).catch("book"),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "راجع الحقول." };
  const supabase = await createClient();
  const { count } = await supabase.from("paths").select("id", { count: "exact", head: true });
  const { data: path, error } = await supabase
    .from("paths")
    .insert({ ...parsed.data, status: "draft", position: (count ?? 0) + 1 })
    .select("id, slug")
    .single();
  if (error || !path) return { error: error?.code === "23505" ? "هذا الرابط مستخدم لمسار آخر." : "تعذر إنشاء المسار." };
  await supabase.from("path_profiles").insert({ path_id: path.id, profile: DEFAULT_PROFILE as never, updated_by: userId });
  revalidatePath("/studio", "layout");
  redirect(`/studio/paths/${path.slug}?new=1`);
}

/** A level added by hand (code, title, goal) together with its settings in the path profile. */
export async function addLevel(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const { userId } = await requireAdmin();
  const pathId = uuid.safeParse(formData.get("path_id"));
  const parsed = z
    .object({
      code: z
        .string()
        .trim()
        .toUpperCase()
        .regex(/^[A-Z0-9]{1,10}$/, "رمز المستوى: حروف إنجليزية وأرقام فقط، مثل A1 أو L1"),
      title: z.string().trim().min(2, "اكتب اسم المستوى").max(80),
      description: z.string().trim().max(400).default(""),
      kind: z.enum(["general", "exam"]).catch("general"),
      planned_units: z.coerce.number().int().min(3, "الوحدات 3 على الأقل").max(60),
      framework: z.enum(FRAMEWORKS).catch("custom"),
      video_language: z.enum(LANGUAGES).catch("ar"),
    })
    .safeParse(Object.fromEntries(formData));
  if (!pathId.success) return { error: "بيانات غير صالحة." };
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "راجع الحقول." };
  const playlistRaw = String(formData.get("source_playlist") ?? "").trim();
  const playlist = playlistRaw ? playlistFromUrl(playlistRaw) : null;
  if (playlistRaw && !playlist) return { error: "رابط قائمة التشغيل غير صحيح. انسخه من يوتيوب (فيه list=)." };
  const supabase = await createClient();
  const { data: existing } = await supabase.from("levels").select("code, position").eq("path_id", pathId.data);
  if ((existing ?? []).some((l) => l.code === parsed.data.code)) return { error: `يوجد مستوى بالرمز ${parsed.data.code}.` };
  const position = Math.max(0, ...(existing ?? []).map((l) => l.position)) + 1;
  const { code, title, description, kind, planned_units, framework, video_language } = parsed.data;
  const { error } = await supabase.from("levels").insert({ path_id: pathId.data, code, title, description, kind, planned_units, position });
  if (error) return { error: dbErrorMessage(error) };
  const { data: prof } = await supabase.from("path_profiles").select("profile").eq("path_id", pathId.data).maybeSingle();
  const profile = parseProfile(prof?.profile);
  const level = {
    code,
    framework,
    video_language,
    unit_template: String(formData.get("unit_template") ?? "standard"),
    ...(playlist ? { source_playlist: playlist } : {}),
  };
  const next = pathProfileSchema.parse({ ...profile, levels: [...profile.levels.filter((l) => l.code !== code), level] });
  await supabase.from("path_profiles").upsert({ path_id: pathId.data, profile: next as never, updated_by: userId });
  revalidatePath("/studio", "layout");
  return { ok: true, message: `أُضيف المستوى ${code}. الخطوة التالية: افتحه واطلب تخطيط خريطته.` };
}

/**
 * Deletes a path with everything built for it (levels, maps, units, jobs). Only a hidden path that no
 * student is enrolled in, and only after the admin types its link: student progress is never lost.
 */
export async function deletePath(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const { userId } = await requireAdmin();
  const pathId = uuid.safeParse(formData.get("path_id"));
  if (!pathId.success) return { error: "بيانات غير صالحة." };
  const supabase = await createClient();
  const { data: path } = await supabase.from("paths").select("id, slug, title, status").eq("id", pathId.data).single();
  if (!path) return { error: "المسار غير موجود." };
  if (String(formData.get("confirm") ?? "").trim() !== path.slug) return { error: `اكتب رابط المسار «${path.slug}» بالضبط للتأكيد.` };
  if (path.status !== "draft") return { error: "المسار ظاهر للطلاب. أخفِه أولاً من إعدادات المسار في الإدارة (الحالة: مسودة)، ثم احذفه." };
  const { count } = await supabase.from("enrollments").select("student_id", { count: "exact", head: true }).eq("path_id", path.id);
  if (count) return { error: `لا يمكن حذف المسار: ${count} طالب مسجّل فيه. الحذف يمسح تقدمهم.` };
  const { error } = await supabase.from("paths").delete().eq("id", path.id);
  if (error) return { error: dbErrorMessage(error) };
  await supabase.from("audit_log").insert({ actor_id: userId, action: "path.delete", target: path.id, data: { slug: path.slug, title: path.title } });
  revalidatePath("/", "layout");
  redirect("/studio?deleted=1");
}
