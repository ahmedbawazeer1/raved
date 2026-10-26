import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ApplyHeader } from "@/components/apply/apply-header";
import { Step2Form } from "@/components/apply/step2-form";
import { requireSession } from "@/lib/auth/session";
import { isStep1Complete } from "@/lib/auth/routing";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "ما هدفك؟" };

export default async function ApplyStep2Page() {
  const { userId, profile, application } = await requireSession("/apply/goal");
  if (profile?.role === "admin") redirect("/admin");
  if (profile?.status === "active") redirect("/student");
  if (!profile || !isStep1Complete(profile)) redirect("/apply");
  if (application && !["draft", "needs_changes"].includes(application.status)) redirect("/apply/status");

  const supabase = await createClient();
  let app = application;
  if (!app) {
    const { data } = await supabase.from("applications").insert({ student_id: userId }).select("*").single();
    app = data;
  }
  const { data: paths } = await supabase.from("paths").select("id, title").eq("status", "published").order("position");
  const published = paths ?? [];

  return (
    <>
      <ApplyHeader step={2} title="ما هدفك؟" backHref="/apply" />
      <Step2Form
        userId={userId}
        paths={published}
        reviewNote={app?.status === "needs_changes" ? app.review_note : null}
        recommendation={
          app?.recommendation_path && app.recommendation_name
            ? { name: app.recommendation_name, size: app.recommendation_size ?? 0 }
            : null
        }
        initial={{
          path_id: app?.path_id ?? (published.length === 1 ? published[0].id : ""),
          target_exam: app?.target_exam ?? "",
          target_date: app?.target_date ?? "",
          daily_minutes: app?.daily_minutes ? String(app.daily_minutes) : "25",
          motivation: app?.motivation ?? "",
        }}
      />
    </>
  );
}
