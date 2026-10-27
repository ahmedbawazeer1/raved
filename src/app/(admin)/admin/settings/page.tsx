import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { En } from "@/components/en";
import { AiSettingsForm } from "@/components/admin/ai-settings-form";
import { DefaultsForm, ExamForm } from "@/components/admin/exam-form";
import { SettingsForm } from "@/components/admin/settings-form";
import { getAiSettings } from "@/lib/ai/limits";
import { aiConfigured } from "@/lib/ai/provider";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "الإعدادات" };

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const [{ data: setting }, { data: exams }, { data: saver }] = await Promise.all([
    supabase.from("settings").select("value").eq("key", "admission_mode").maybeSingle(),
    supabase.from("exams").select("code, name, availability_ye, locations, fee_note, payment_note, official_practice_url, verified_at").order("position"),
    supabase.from("settings").select("value").eq("key", "data_saver_default").maybeSingle(),
  ]);
  const mode = typeof setting?.value === "string" ? setting.value : "review";
  const ai = await getAiSettings();

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-[28px] font-bold">الإعدادات</h1>
      <Card className="p-5 md:p-6">
        <h2 className="mb-3 text-lg font-bold">القبول</h2>
        <SettingsForm admissionMode={mode} />
      </Card>
      <Card className="p-5 md:p-6">
        <h2 className="mb-1 text-lg font-bold">الذكاء الاصطناعي</h2>
        {!aiConfigured() && (
          <p className="mb-3 rounded-lg bg-warning-tint p-3 text-sm text-[#5C3D00]">
            غير مفعّل: أضف المفتاح <En>GROQ_API_KEY</En> في Vercel (راجع docs/PHASE5_SETUP_AR.md).
          </p>
        )}
        <AiSettingsForm
          speaking={ai.limits.speaking}
          writing={ai.limits.writing}
          assistant={ai.limits.assistant}
          quota={ai.dailyQuota.groq ?? 1000}
          alert={ai.alertPercent}
          paused={ai.paused}
        />
      </Card>
      <Card className="p-5 md:p-6">
        <h2 className="mb-3 text-lg font-bold">الإعدادات الافتراضية</h2>
        <DefaultsForm dataSaver={saver?.value !== false} />
      </Card>
      <Card className="p-5 md:p-6">
        <h2 className="mb-1 text-lg font-bold">معلومات الامتحانات في اليمن</h2>
        <p className="text-sm text-muted-foreground">
          يراها الطلاب في صفحة التقدم ومسار الامتحان. عند الحفظ يُسجَّل تاريخ اليوم كتاريخ تحقق، فاحفظ فقط بعد أن تتأكد من المعلومات.
        </p>
        {(exams ?? []).map((e) => (
          <ExamForm key={e.code} exam={e} />
        ))}
      </Card>
    </div>
  );
}
