import type { Metadata } from "next";
import { FileBadge, SlidersHorizontal, Smartphone, Sparkles, UserCheck } from "lucide-react";
import { PageHead, Panel } from "@/components/console/ui";
import { En } from "@/components/en";
import { AiSettingsForm } from "@/components/admin/ai-settings-form";
import { DefaultsForm, ExamForm } from "@/components/admin/exam-form";
import { SettingsForm } from "@/components/admin/settings-form";
import { AppConfigForm } from "@/components/admin/app-config-form";
import { parseAppConfig } from "@shared/app-config";
import { getAiSettings } from "@/lib/ai/limits";
import { aiConfigured } from "@/lib/ai/provider";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "الإعدادات" };

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const [{ data: setting }, { data: exams }, { data: saver }, { data: appConfig }] = await Promise.all([
    supabase.from("settings").select("value").eq("key", "admission_mode").maybeSingle(),
    supabase.from("exams").select("code, name, availability_ye, locations, fee_note, payment_note, official_practice_url, verified_at").order("position"),
    supabase.from("settings").select("value").eq("key", "data_saver_default").maybeSingle(),
    supabase.from("app_config").select("value").eq("id", "mobile").maybeSingle(),
  ]);
  const mode = typeof setting?.value === "string" ? setting.value : "review";
  const ai = await getAiSettings();

  return (
    <div className="flex flex-col gap-5">
      <PageHead title="الإعدادات" sub="كل إعداد في بطاقة. يُحفظ عند الضغط على «احفظ» في البطاقة نفسها." />
      <div className="grid items-start gap-5 xl:grid-cols-2">
        <Panel title="القبول" icon={UserCheck}>
          <SettingsForm admissionMode={mode} />
        </Panel>
        <Panel title="الذكاء الاصطناعي للطلاب" icon={Sparkles}>
          {!aiConfigured() && (
            <p className="mb-3 rounded-xl bg-warning-tint p-3 text-sm text-warning">
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
        </Panel>
        <Panel title="تطبيق الجوال" icon={Smartphone}>
          <p className="mb-3 text-sm text-muted-foreground">تتحكم في التطبيق دون إصدار نسخة جديدة: تصل التغييرات للطلاب عند فتحهم التطبيق.</p>
          <AppConfigForm config={parseAppConfig(appConfig?.value)} />
        </Panel>
        <Panel title="الإعدادات الافتراضية" icon={SlidersHorizontal}>
          <DefaultsForm dataSaver={saver?.value !== false} />
        </Panel>
      </div>
      <Panel title="معلومات الامتحانات في اليمن" icon={FileBadge}>
        <p className="text-sm text-muted-foreground">
          يراها الطلاب في صفحة التقدم ومسار الامتحان. عند الحفظ يُسجَّل تاريخ اليوم كتاريخ تحقق، فاحفظ فقط بعد أن تتأكد من المعلومات.
        </p>
        {(exams ?? []).map((e) => (
          <ExamForm key={e.code} exam={e} />
        ))}
      </Panel>
    </div>
  );
}
