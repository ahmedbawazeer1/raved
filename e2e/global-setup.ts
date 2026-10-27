import { readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { STUDENT } from "./fixtures";

/** Prepares an active student enrolled in English, with unit A1-01 imported and published. */
export default async function globalSetup() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !serviceKey) throw new Error("E2E needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  // Student account (confirmed, so no email is needed).
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 200 });
  let user = list?.users.find((u) => u.email === STUDENT.email);
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email: STUDENT.email,
      password: STUDENT.password,
      email_confirm: true,
      user_metadata: { full_name: STUDENT.name },
    });
    if (error) throw error;
    user = data.user;
  }

  const { data: english } = await admin.from("paths").select("id").eq("slug", "english").single();
  const { data: a1 } = await admin.from("levels").select("id").eq("path_id", english!.id).eq("code", "A1").single();
  const { error: profileError } = await admin
    .from("profiles")
    .update({ status: "active", full_name: STUDENT.name, primary_path_id: english!.id, daily_goal_minutes: 25 })
    .eq("id", user!.id);
  if (profileError) throw profileError;
  await admin
    .from("enrollments")
    .upsert({ student_id: user!.id, path_id: english!.id, is_primary: true, current_level_id: a1!.id }, { onConflict: "student_id,path_id" });

  // Content: import, approve and publish the example unit.
  const pkg = JSON.parse(readFileSync(path.join(__dirname, "..", "content", "examples", "A1-01.json"), "utf8"));
  const { data: unitId, error: importError } = await admin.rpc("import_unit_package", { p_package: pkg });
  if (importError) throw importError;
  await admin.from("lessons").update({ review_status: "approved" }).eq("unit_id", unitId);
  const { error: publishError } = await admin.rpc("publish_unit", { p_unit_id: unitId });
  if (publishError) throw publishError;

  // Fresh progress for every run.
  await admin.from("lesson_progress").delete().eq("student_id", user!.id);
  await admin.from("quiz_attempts").delete().eq("student_id", user!.id);
  await admin.from("vocab_reviews").delete().eq("student_id", user!.id);
  await admin.from("placement_attempts").delete().eq("student_id", user!.id);
  await admin.from("skill_estimates").delete().eq("student_id", user!.id);
  await admin.from("enrollments").update({ start_unit_id: null }).eq("student_id", user!.id);
  await admin.from("writing_submissions").delete().eq("student_id", user!.id);
  await admin.from("speaking_attempts").delete().eq("student_id", user!.id);
  await admin.from("ai_usage").delete().eq("student_id", user!.id);
  await admin.from("certificates").delete().eq("student_id", user!.id);
}
