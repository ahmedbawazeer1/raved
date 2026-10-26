"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/session";
import { dbErrorMessage } from "@/lib/auth/errors";
import { readRepoUnitFile } from "@/lib/content/repo";
import { validateUnitPackage, type ValidationIssue } from "@/lib/content/validate";

export interface ImportState {
  checked?: boolean;
  ok?: boolean;
  code?: string;
  title?: string;
  sizeBytes?: number;
  errors?: ValidationIssue[];
  warnings?: ValidationIssue[];
  error?: string;
}

async function loadSource(formData: FormData): Promise<{ text: string; fileName?: string } | { error: string }> {
  const repoFile = String(formData.get("repo_file") ?? "");
  if (repoFile) {
    const text = await readRepoUnitFile(repoFile);
    return text ? { text, fileName: repoFile.split("/").pop() } : { error: "الملف غير موجود في المستودع." };
  }
  const file = formData.get("file");
  if (file instanceof File && file.size > 0) {
    if (file.size > 3 * 1024 * 1024) return { error: "الملف أكبر من 3MB." };
    return { text: await file.text(), fileName: file.name };
  }
  return { error: "اختر ملف وحدة أولاً." };
}

/** Validates (action=check) or validates + imports (action=import) a unit package. */
export async function checkOrImportUnit(_prev: ImportState, formData: FormData): Promise<ImportState> {
  await requireAdmin();
  const source = await loadSource(formData);
  if ("error" in source) return { error: source.error };

  let data: unknown;
  try {
    data = JSON.parse(source.text);
  } catch {
    return { checked: true, ok: false, errors: [{ level: "error", path: "/", message: "الملف ليس JSON صالحاً." }], warnings: [] };
  }
  // Check the file name only when it looks like a unit code (browsers may rename downloads, e.g. "A1-01 (1).json").
  const fileName = source.fileName && /^[A-Z0-9]+-\d{2}\.json$/.test(source.fileName) ? source.fileName : undefined;
  const result = validateUnitPackage(data, { fileName });
  const base: ImportState = {
    checked: true,
    ok: result.ok,
    code: result.pkg?.code,
    title: result.pkg?.title,
    sizeBytes: result.sizeBytes,
    errors: result.errors,
    warnings: result.warnings,
  };
  if (!result.ok || formData.get("intent") !== "import") return base;

  const supabase = await createClient();
  const { error } = await supabase.rpc("import_unit_package", { p_package: data as never });
  if (error) {
    const message = error.message === "unknown_level" ? "المستوى أو المسار في الملف غير موجود." : dbErrorMessage(error);
    return { ...base, ok: false, error: message };
  }
  revalidatePath("/admin/content");
  redirect(`/admin/content/${result.pkg!.code}?imported=1`);
}

export interface ReviewState {
  ok?: boolean;
  error?: string;
}

export async function reviewLesson(_prev: ReviewState, formData: FormData): Promise<ReviewState> {
  await requireAdmin();
  const lessonId = z.uuid().safeParse(formData.get("lesson_id"));
  const status = z.enum(["approved", "changes"]).safeParse(formData.get("status"));
  const note = String(formData.get("note") ?? "").trim().slice(0, 2000) || null;
  if (!lessonId.success || !status.success) return { error: "حدث خطأ." };
  if (status.data === "changes" && !note) return { error: "اكتب الملاحظة أولاً." };

  const supabase = await createClient();
  const { error } = await supabase.from("lessons").update({ review_status: status.data, review_note: note }).eq("id", lessonId.data);
  if (error) return { error: "تعذر الحفظ." };
  revalidatePath("/admin/content", "layout");
  return { ok: true };
}

export async function publishUnit(_prev: ReviewState, formData: FormData): Promise<ReviewState> {
  await requireAdmin();
  const unitId = z.uuid().safeParse(formData.get("unit_id"));
  if (!unitId.success) return { error: "حدث خطأ." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("publish_unit", { p_unit_id: unitId.data });
  if (error) {
    return {
      error:
        error.message === "lessons_not_approved"
          ? "اعتمد كل الدروس أولاً، ثم انشر."
          : error.message === "unit_empty"
            ? "الوحدة بلا دروس."
            : dbErrorMessage(error),
    };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function unpublishUnit(formData: FormData): Promise<void> {
  await requireAdmin();
  const unitId = z.uuid().parse(formData.get("unit_id"));
  const supabase = await createClient();
  await supabase.from("units").update({ status: "review" }).eq("id", unitId);
  revalidatePath("/", "layout");
}
