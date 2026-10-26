import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ApplyHeader } from "@/components/apply/apply-header";
import { Step1Form } from "@/components/apply/step1-form";
import { requireSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "أكمل بياناتك" };

export default async function ApplyStep1Page() {
  const { profile, application } = await requireSession("/apply");
  if (profile?.role === "admin") redirect("/admin");
  if (profile?.status === "active") redirect("/student");
  if (application && !["draft", "needs_changes"].includes(application.status)) redirect("/apply/status");

  const supabase = await createClient();
  const { data: governorates } = await supabase.from("governorates").select("code, name_ar").order("position");

  return (
    <>
      <ApplyHeader step={1} title="أكمل بياناتك" backHref="/" />
      <Step1Form
        governorates={governorates ?? []}
        initial={{
          full_name: profile?.full_name ?? "",
          birth_date: profile?.birth_date ?? "",
          governorate: profile?.governorate ?? "",
          city: profile?.city ?? "",
          school: profile?.school ?? "",
          grade: profile?.grade ? String(profile.grade) : "",
          stream: profile?.stream ?? "",
          phone: profile?.phone ?? "",
        }}
      />
    </>
  );
}
