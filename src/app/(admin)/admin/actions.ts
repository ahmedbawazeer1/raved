"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/session";
import { dbErrorMessage } from "@/lib/auth/errors";
import { sendEmail } from "@/lib/email";
import { getOrigin } from "@/lib/site-url";
import { PATH_FEATURES } from "@/lib/paths/features";

export interface AdminFormState {
  ok?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Applications
// ---------------------------------------------------------------------------
const DECISION_EMAIL: Record<string, { subject: string; text: (note: string | null) => string; path: string; label: string }> = {
  approved: {
    subject: "تم قبولك في رفد",
    text: () => "مبروك! قُبل طلبك في منصة رفد. تستطيع أن تبدأ الآن.",
    path: "/student",
    label: "ابدأ الآن",
  },
  needs_changes: {
    subject: "طلبك في رفد يحتاج تعديلاً",
    text: (note) => `راجعنا طلبك ونحتاج تعديلاً بسيطاً قبل القبول.\n\nملاحظة الفريق: ${note ?? ""}`,
    path: "/apply/goal",
    label: "عدّل طلبك",
  },
  rejected: {
    subject: "بخصوص طلبك في رفد",
    text: (note) => `نشكرك على اهتمامك برفد. لم نتمكن من قبول طلبك هذه المرة.\n\nملاحظة الفريق: ${note ?? ""}`,
    path: "/apply/status",
    label: "تفاصيل الطلب",
  },
};

export async function reviewApplication(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireAdmin();
  const id = z.uuid().safeParse(formData.get("application_id"));
  const decision = z.enum(["approved", "needs_changes", "rejected"]).safeParse(formData.get("decision"));
  const note = String(formData.get("note") ?? "").trim().slice(0, 1000);
  if (!id.success || !decision.success) return { error: "حدث خطأ. حدّث الصفحة وحاول مرة أخرى." };
  if (decision.data !== "approved" && !note) {
    return { fieldErrors: { note: "اكتب ملاحظة للطالب توضح المطلوب أو السبب." } };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("review_application", {
    p_application_id: id.data,
    p_decision: decision.data,
    p_note: note || undefined,
  });
  if (error) return { error: dbErrorMessage(error) };

  const result = data as { email?: string | null; note?: string | null };
  const template = DECISION_EMAIL[decision.data];
  if (result.email) {
    const origin = await getOrigin();
    await sendEmail({
      to: result.email,
      subject: template.subject,
      text: template.text(result.note ?? null),
      link: { href: `${origin}${template.path}`, label: template.label },
    });
  }

  revalidatePath("/admin", "layout");
  const next = String(formData.get("next_id") ?? "");
  redirect(next ? `/admin/applications?id=${next}&done=${decision.data}` : `/admin/applications?done=${decision.data}`);
}

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------
const pathSchema = z.object({
  id: z.uuid().optional(),
  title: z.string().trim().min(2, "اكتب اسم المسار").max(120, "الاسم طويل جداً"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9][a-z0-9-]{1,40}$/, "حروف إنجليزية صغيرة وأرقام وشرطة فقط، مثل web"),
  summary: z.string().trim().max(200, "الوصف القصير طويل جداً"),
  description: z.string().trim().max(1500, "الوصف طويل جداً"),
  status: z.enum(["draft", "soon", "published"]),
  position: z.coerce.number().int().min(0).max(999),
  icon: z.enum(["book", "code", "database", "pen"]),
  est_months: z
    .string()
    .trim()
    .transform((v) => (v ? Number(v) : null))
    .refine((v) => v === null || (Number.isInteger(v) && v > 0 && v < 120), "عدد أشهر غير صحيح"),
  daily_minutes: z.coerce.number().int().min(5).max(240),
});

export async function savePath(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireAdmin();
  const raw = Object.fromEntries(formData);
  const parsed = pathSchema.safeParse({ ...raw, id: raw.id || undefined });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { fieldErrors, error: "راجع الحقول المظللة." };
  }
  const features = Object.fromEntries(PATH_FEATURES.map(({ key }) => [key, formData.get(`feature_${key}`) === "on"]));
  const { id, ...values } = parsed.data;

  const supabase = await createClient();
  let previousStatus: string | null = null;
  if (id) {
    const { data: current } = await supabase.from("paths").select("status, published_at").eq("id", id).single();
    previousStatus = current?.status ?? null;
    const publishedAt = values.status === "published" && !current?.published_at ? new Date().toISOString() : current?.published_at;
    const { error } = await supabase.from("paths").update({ ...values, features, published_at: publishedAt ?? null }).eq("id", id);
    if (error) return { error: error.code === "23505" ? "هذا الرابط مستخدم لمسار آخر." : "تعذر الحفظ. حاول مرة أخرى." };
  } else {
    const { error } = await supabase.from("paths").insert({
      ...values,
      features,
      published_at: values.status === "published" ? new Date().toISOString() : null,
    });
    if (error) return { error: error.code === "23505" ? "هذا الرابط مستخدم لمسار آخر." : "تعذر الحفظ. حاول مرة أخرى." };
  }

  revalidatePath("/", "layout");
  const justPublished = values.status === "published" && previousStatus !== "published";
  redirect(`/admin/paths?edit=${values.slug}&saved=1${justPublished ? "&published=1" : ""}`);
}

export async function notifyWaitlist(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireAdmin();
  const id = z.uuid().safeParse(formData.get("path_id"));
  if (!id.success) return { error: "حدث خطأ. حدّث الصفحة." };

  const supabase = await createClient();
  const { data: emails, error } = await supabase.rpc("notify_path_waitlist", { p_path_id: id.data });
  if (error) return { error: dbErrorMessage(error) };

  const { data: path } = await supabase.from("paths").select("title, slug").eq("id", id.data).single();
  const origin = await getOrigin();
  let sent = 0;
  for (const email of emails ?? []) {
    const res = await sendEmail({
      to: email,
      subject: `انطلق مسار ${path?.title ?? ""} في رفد`,
      text: `المسار الذي طلبت إبلاغك به متاح الآن: ${path?.title ?? ""}.`,
      link: { href: `${origin}/paths/${path?.slug ?? ""}`, label: "افتح المسار" },
    });
    if (res.sent) sent += 1;
  }
  revalidatePath("/admin/paths");
  const total = emails?.length ?? 0;
  return {
    ok: true,
    message:
      total === 0
        ? "لا يوجد أحد جديد في قائمة الانتظار. أُرسلت إشعارات المنصة لمن سجّلوا بحساباتهم."
        : `أُبلغ ${total} شخصاً${sent < total ? ` (وصل البريد إلى ${sent} منهم؛ البريد يحتاج إعداد Resend)` : ""}.`,
  };
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------
export async function saveSettings(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const { userId } = await requireAdmin();
  const mode = z.enum(["review", "auto"]).safeParse(formData.get("admission_mode"));
  if (!mode.success) return { error: "اختر نمط القبول." };

  const supabase = await createClient();
  const { error } = await supabase.from("settings").upsert({ key: "admission_mode", value: mode.data });
  if (error) return { error: "تعذر الحفظ. حاول مرة أخرى." };
  await supabase.from("audit_log").insert({ actor_id: userId, action: "settings.admission_mode", target: "admission_mode", data: { value: mode.data } });
  revalidatePath("/admin/settings");
  return { ok: true, message: "حُفظت الإعدادات." };
}

// ---------------------------------------------------------------------------
// AI: daily limits per student, pause switch, provider quota; human review
// ---------------------------------------------------------------------------
const limit = z.coerce.number().int().min(0).max(100);

export async function saveAiSettings(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const { userId } = await requireAdmin();
  const parsed = z
    .object({
      speaking: limit,
      writing: limit,
      assistant: limit,
      quota: z.coerce.number().int().min(1).max(1_000_000),
      alert: z.coerce.number().int().min(1).max(100),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "تحقق من الأرقام: الحدود من 0 إلى 100، ونسبة التنبيه من 1 إلى 100." };
  const { speaking, writing, assistant, quota, alert } = parsed.data;
  const paused = formData.get("paused") === "on";

  const supabase = await createClient();
  const { error } = await supabase.from("settings").upsert([
    { key: "ai_limits", value: { speaking, writing, assistant } },
    { key: "ai_paused", value: paused },
    { key: "ai_daily_quota", value: { groq: quota } },
    { key: "quota_alert_percent", value: alert },
  ]);
  if (error) return { error: "تعذر الحفظ. حاول مرة أخرى." };
  await supabase.from("audit_log").insert({ actor_id: userId, action: "settings.ai", target: "ai", data: { speaking, writing, assistant, quota, alert, paused } });
  revalidatePath("/admin/settings");
  revalidatePath("/admin/ai-review");
  return { ok: true, message: "حُفظت إعدادات الذكاء الاصطناعي." };
}

export async function reviewAiAttempt(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const { userId } = await requireAdmin();
  const parsed = z
    .object({ attempt_type: z.enum(["speaking", "writing"]), attempt_id: z.uuid(), agrees: z.enum(["yes", "no"]), note: z.string().max(1000).optional() })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "حدث خطأ." };
  const supabase = await createClient();
  const { error } = await supabase.from("ai_reviews").upsert(
    {
      attempt_type: parsed.data.attempt_type,
      attempt_id: parsed.data.attempt_id,
      reviewer_id: userId,
      agrees: parsed.data.agrees === "yes",
      note: parsed.data.note?.trim() || null,
    },
    { onConflict: "attempt_type,attempt_id,reviewer_id" },
  );
  if (error) return { error: "تعذر الحفظ." };
  revalidatePath("/admin/ai-review");
  return { ok: true, message: "حُفظ رأيك." };
}

// ---------------------------------------------------------------------------
// Students: phone reveal (logged), suspend / reactivate
// ---------------------------------------------------------------------------
export async function revealStudentPhone(studentId: string): Promise<{ phone?: string; error?: string }> {
  const { userId } = await requireAdmin();
  if (!z.uuid().safeParse(studentId).success) return { error: "حدث خطأ." };
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("phone").eq("id", studentId).maybeSingle();
  if (!data?.phone) return { error: "لا يوجد رقم." };
  await supabase.from("audit_log").insert({ actor_id: userId, action: "student.phone_reveal", target: studentId, data: {} });
  return { phone: data.phone };
}

export async function setStudentStatus(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const { userId } = await requireAdmin();
  const parsed = z.object({ student_id: z.uuid(), status: z.enum(["active", "suspended"]) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "حدث خطأ." };
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ status: parsed.data.status }).eq("id", parsed.data.student_id).eq("role", "student");
  if (error) return { error: "تعذر الحفظ." };
  await supabase.from("audit_log").insert({
    actor_id: userId,
    action: `student.${parsed.data.status === "suspended" ? "suspend" : "reactivate"}`,
    target: parsed.data.student_id,
    data: {},
  });
  revalidatePath(`/admin/students/${parsed.data.student_id}`);
  return { ok: true, message: parsed.data.status === "suspended" ? "أُوقف الحساب." : "أُعيد تفعيل الحساب." };
}

export async function resolveReport(formData: FormData): Promise<void> {
  const { userId } = await requireAdmin();
  const id = z.uuid().safeParse(formData.get("report_id"));
  if (!id.success) return;
  const supabase = await createClient();
  await supabase.from("reports").update({ status: "resolved" }).eq("id", id.data);
  await supabase.from("audit_log").insert({ actor_id: userId, action: "report.resolve", target: id.data, data: {} });
  revalidatePath("/admin/reports");
}

// ---------------------------------------------------------------------------
// Exams info (from Yemen) and general defaults
// ---------------------------------------------------------------------------
const examText = (max: number) => z.string().trim().max(max, "النص طويل جداً");

export async function saveExam(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const { userId } = await requireAdmin();
  const parsed = z
    .object({
      code: z.string().regex(/^[a-z]{2,10}$/),
      availability_ye: examText(500),
      locations: examText(500),
      fee_note: examText(300),
      payment_note: examText(300),
      official_practice_url: z.union([z.literal(""), z.url({ protocol: /^https$/ })]),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "تحقق من الحقول (الرابط يبدأ بـ https)." };
  const { code, official_practice_url, ...rest } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("exams")
    .update({ ...rest, official_practice_url: official_practice_url || null, verified_at: new Date().toISOString() })
    .eq("code", code);
  if (error) return { error: "تعذر الحفظ." };
  await supabase.from("audit_log").insert({ actor_id: userId, action: "exam.update", target: code, data: {} });
  revalidatePath("/admin/settings");
  revalidatePath("/student/progress");
  return { ok: true, message: "حُفظت معلومات الامتحان، وسُجّل تاريخ التحقق اليوم." };
}

export async function saveDefaults(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const { userId } = await requireAdmin();
  const dataSaver = formData.get("data_saver_default") === "on";
  const supabase = await createClient();
  const { error } = await supabase.from("settings").upsert({ key: "data_saver_default", value: dataSaver });
  if (error) return { error: "تعذر الحفظ." };
  await supabase.from("audit_log").insert({ actor_id: userId, action: "settings.defaults", target: "data_saver_default", data: { dataSaver } });
  revalidatePath("/admin/settings");
  return { ok: true, message: "حُفظت الإعدادات." };
}
