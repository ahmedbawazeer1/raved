import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface StudentFilters {
  q?: string;
  governorate?: string;
  status?: string;
  level?: string;
}

export function parseStudentFilters(sp: Record<string, string | string[] | undefined>): StudentFilters {
  const one = (v: string | string[] | undefined) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 80) : undefined);
  return { q: one(sp.q), governorate: one(sp.governorate), status: one(sp.status), level: one(sp.level) };
}

/** Students for the admin list (admin RLS). Phone is never selected here. */
export async function listStudents(f: StudentFilters, limit = 300) {
  const supabase = await createClient();
  let query = supabase
    .from("profiles")
    .select("id, full_name, email, governorate, grade, status, created_at, last_active_at, enrollments(is_primary, levels!enrollments_current_level_id_fkey(code))")
    .eq("role", "student")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (f.q) {
    const term = f.q.replace(/[%,()*]/g, " ");
    query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%`);
  }
  if (f.governorate) query = query.eq("governorate", f.governorate);
  if (f.status) query = query.eq("status", f.status);
  const { data } = await query;
  const rows = (data ?? []).map((p) => ({
    ...p,
    level: p.enrollments?.find((e) => e.is_primary)?.levels?.code ?? null,
  }));
  return f.level ? rows.filter((r) => (r.level ?? "none") === f.level) : rows;
}

export const STUDENT_STATUS_AR: Record<string, string> = { active: "نشط", pending: "لم يُقبل بعد", suspended: "موقوف" };
