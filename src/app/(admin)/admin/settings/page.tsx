import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { En } from "@/components/en";
import { SettingsForm } from "@/components/admin/settings-form";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "الإعدادات" };

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const [{ data: setting }, { data: exams }] = await Promise.all([
    supabase.from("settings").select("value").eq("key", "admission_mode").maybeSingle(),
    supabase.from("exams").select("code, name, locations, fee_note, verified_at").order("position"),
  ]);
  const mode = typeof setting?.value === "string" ? setting.value : "review";

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-[28px] font-bold">الإعدادات</h1>
      <Card className="p-5 md:p-6">
        <h2 className="mb-3 text-lg font-bold">القبول</h2>
        <SettingsForm admissionMode={mode} />
      </Card>
      <Card className="p-5 md:p-6">
        <h2 className="mb-1 text-lg font-bold">معلومات الامتحانات في اليمن</h2>
        <p className="mb-3 text-sm text-muted-foreground">تعديلها من هنا يأتي في مرحلة لاحقة. لم يُتحقق منها بعد.</p>
        {(exams ?? []).map((e) => (
          <div key={e.code} className="flex flex-wrap items-center gap-3 border-b border-muted py-3 text-sm last:border-b-0">
            <En className="w-28 font-semibold">{e.name}</En>
            <span className="flex-1">
              {e.locations} · {e.fee_note}
            </span>
            <span className="text-muted-foreground">{e.verified_at ? `تحقق: ${new Date(e.verified_at).toLocaleDateString("ar")}` : "لم يُتحقق"}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}
