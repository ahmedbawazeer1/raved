"use server";

import { z } from "zod";
import { getSessionContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type SearchHit = { group: "طلاب" | "وحدات"; label: string; detail: string; href: string };

const query = z.string().trim().min(2).max(60);

/** The console search (Ctrl K): students for the admin, factory units for staff. RLS limits what each role can read. */
export async function consoleSearch(raw: string): Promise<SearchHit[]> {
  const parsed = query.safeParse(raw);
  if (!parsed.success) return [];
  const ctx = await getSessionContext();
  const role = ctx?.profile?.role;
  if (role !== "admin" && role !== "teacher") return [];
  const q = parsed.data.replace(/[\\%_,()]/g, " ").trim();
  if (q.length < 2) return [];
  const like = `%${q}%`;
  const supabase = await createClient();
  const [units, students] = await Promise.all([
    supabase
      .from("curriculum_units")
      .select("id, code, title_en, title_ar, stop_ar")
      .or(`code.ilike.${like},title_en.ilike.${like},title_ar.ilike.${like}`)
      .order("code")
      .limit(6),
    role === "admin"
      ? supabase.from("profiles").select("id, full_name, governorate").eq("role", "student").ilike("full_name", like).order("full_name").limit(6)
      : Promise.resolve({ data: [] as { id: string; full_name: string; governorate: string | null }[] }),
  ]);
  return [
    ...(students.data ?? []).map((s) => ({ group: "طلاب" as const, label: s.full_name, detail: "طالب", href: `/admin/students/${s.id}` })),
    ...(units.data ?? []).map((u) => ({
      group: "وحدات" as const,
      label: `${u.code} · ${u.title_en}`,
      detail: `${u.title_ar} · ${u.stop_ar}`,
      href: `/studio/units/${u.id}`,
    })),
  ];
}
