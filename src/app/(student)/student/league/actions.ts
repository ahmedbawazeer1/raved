"use server";

import { revalidatePath } from "next/cache";
import { requireActiveStudent } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

/** Join or leave the weekly league (only those who join are shown to others). */
export async function setLeagueOptIn(formData: FormData): Promise<void> {
  await requireActiveStudent();
  const supabase = await createClient();
  await supabase.rpc("set_league_opt_in", { p_join: formData.get("join") === "1" });
  revalidatePath("/student/league");
}
