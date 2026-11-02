import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/** The student's point rows (RLS: own rows only). */
export const getXpRows = cache(async (userId: string): Promise<{ kind: string; points: number; created_at: string }[]> => {
  const supabase = await createClient();
  const { data } = await supabase.from("xp_events").select("kind, points, created_at").eq("student_id", userId).limit(10_000);
  return data ?? [];
});
