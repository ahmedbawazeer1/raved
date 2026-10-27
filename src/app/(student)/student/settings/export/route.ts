import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** «تنزيل بياناتي»: everything stored about the student, as one JSON file (RLS: own rows only). */
export async function GET() {
  const ctx = await getSessionContext();
  if (!ctx) return NextResponse.json({ error: "not_signed_in" }, { status: 401 });
  const supabase = await createClient();
  const id = ctx.userId;
  const [enrollments, lessons, quizzes, vocab, placement, skills, speaking, writing, certificates, notifications, reports] = await Promise.all([
    supabase.from("enrollments").select("*").eq("student_id", id),
    supabase.from("lesson_progress").select("*").eq("student_id", id),
    supabase.from("quiz_attempts").select("*").eq("student_id", id),
    supabase.from("vocab_reviews").select("*").eq("student_id", id),
    supabase.from("placement_attempts").select("*").eq("student_id", id),
    supabase.from("skill_estimates").select("*").eq("student_id", id),
    supabase.from("speaking_attempts").select("*").eq("student_id", id),
    supabase.from("writing_submissions").select("*").eq("student_id", id),
    supabase.from("certificates").select("*").eq("student_id", id),
    supabase.from("notifications").select("*").eq("student_id", id),
    supabase.from("reports").select("*").eq("student_id", id),
  ]);
  const { recommendation_path: _file, ...application } = (ctx.application ?? {}) as Record<string, unknown>;
  void _file;

  const body = {
    exported_at: new Date().toISOString(),
    note: "بياناتك في منصة رفد. لا نحفظ أي تسجيل صوتي.",
    profile: ctx.profile,
    application: ctx.application ? application : null,
    enrollments: enrollments.data,
    lesson_progress: lessons.data,
    quiz_attempts: quizzes.data,
    vocab_reviews: vocab.data,
    placement_attempts: placement.data,
    skill_estimates: skills.data,
    speaking_attempts: speaking.data,
    writing_submissions: writing.data,
    certificates: certificates.data,
    notifications: notifications.data,
    reports: reports.data,
  };
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="raved-my-data.json"',
      "Cache-Control": "no-store",
    },
  });
}
