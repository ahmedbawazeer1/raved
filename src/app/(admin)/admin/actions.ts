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
