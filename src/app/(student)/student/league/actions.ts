"use server";

import { revalidatePath } from "next/cache";
import { requireActiveStudent } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

/** Leave or re-join the league (everyone is in by default). */
export async function setLeagueOptIn(formData: FormData): Promise<void> {
  await requireActiveStudent();
  const supabase = await createClient();
  await supabase.rpc("set_league_opt_in", { p_join: formData.get("join") === "1" });
  revalidatePath("/student/league");
}

/** The Friday announcement was shown. */
export async function leagueResultSeen(): Promise<void> {
  await requireActiveStudent();
  const supabase = await createClient();
  await supabase.rpc("league_result_seen");
}
