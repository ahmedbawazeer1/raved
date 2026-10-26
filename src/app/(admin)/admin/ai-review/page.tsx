import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { En } from "@/components/en";
import { AiReviewForm } from "@/components/admin/ai-review-form";
import { quotaStatus, yemenDay } from "@/lib/ai/limits";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "مراجعة التقييم الآلي" };

const SAMPLE = 10;

/** Stable "random" order for the month, so the sample doesn't change on every refresh. */
function shuffleKey(id: string, month: string): number {
  let h = 0;
  for (const c of id + month) h = (h * 31 + c.charCodeAt(0)) | 0;
  return h;
}

export default async function AiReviewPage() {
  const supabase = await createClient();
  const month = yemenDay().slice(0, 7);
  const since = `${month}-01T00:00:00+03:00`;

  const [{ data: speaking }, { data: writing }, { data: reviews }, quotas, { data: usage }] = await Promise.all([
    supabase.from("speaking_attempts").select("id, prompt_en, transcript, feedback, estimated_cefr, model, prompt_version, created_at").gte("created_at", since).eq("status", "evaluated").limit(300),
    supabase.from("writing_submissions").select("id, prompt_en, text, feedback, estimated_cefr, model, prompt_version, created_at").gte("created_at", since).eq("status", "evaluated").limit(300),
    supabase.from("ai_reviews").select("attempt_type, attempt_id, agrees, created_at").gte("created_at", since),
    quotaStatus(),
    supabase.from("ai_usage").select("feature, ok").eq("day", yemenDay()),
  ]);

  const reviewed = new Map((reviews ?? []).map((r) => [`${r.attempt_type}:${r.attempt_id}`, r.agrees]));
  const items = [
    ...(speaking ?? []).map((a) => ({ type: "speaking" as const, id: a.id, prompt: a.prompt_en, text: a.transcript, feedback: a.feedback, cefr: a.estimated_cefr, model: a.model, version: a.prompt_version })),
    ...(writing ?? []).map((w) => ({ type: "writing" as const, id: w.id, prompt: w.prompt_en, text: w.text, feedback: w.feedback, cefr: w.estimated_cefr, model: w.model, version: w.prompt_version })),
  ]
    .sort((a, b) => shuffleKey(a.id, month) - shuffleKey(b.id, month))
    .slice(0, SAMPLE);
  const agreeCount = (reviews ?? []).filter((r) => r.agrees).length;
  const total = reviews?.length ?? 0;
  const todayOk = (usage ?? []).filter((u) => u.ok).length;
  const todayFailed = (usage ?? []).length - todayOk;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[28px] font-bold">مراجعة التقييم الآلي</h1>
        <p className="text-sm text-muted-foreground">
          عيّنة عشوائية من تقييمات هذا الشهر. اقرأ ما كتبه أو قاله الطالب والتقييم، ثم قل هل توافق عليه. هذا يقيس جودة الذكاء الاصطناعي.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="flex flex-col gap-1 p-[18px]">
          <span className="text-sm text-muted-foreground">نسبة الموافقة هذا الشهر</span>
          <span className="font-en text-3xl font-bold">{total ? `${Math.round((agreeCount / total) * 100)}%` : "—"}</span>
          <span className="text-xs text-muted-foreground">من {total} مراجعة</span>
        </Card>
        <Card className="flex flex-col gap-1 p-[18px]">
          <span className="text-sm text-muted-foreground">طلبات اليوم</span>
          <span className="font-en text-3xl font-bold">{todayOk}</span>
          <span className="text-xs text-muted-foreground">{todayFailed} فشلت</span>
        </Card>
        {quotas.map((q) => (
          <Card key={q.provider} className={`flex flex-col gap-1 p-[18px] ${q.alert ? "border-accent bg-warning-tint" : ""}`}>
            <span className="text-sm text-muted-foreground">
              الحصة اليومية · <En>{q.provider}</En>
            </span>
            <span className="font-en text-3xl font-bold">{q.percent}%</span>
            <span className="text-xs text-muted-foreground">
              {q.requests} من {q.quota}
              {q.alert ? " · تجاوزت حد التنبيه" : ""}
            </span>
          </Card>
        ))}
      </div>

      {items.length === 0 && <Card className="p-5 text-sm text-muted-foreground">لا توجد تقييمات هذا الشهر بعد.</Card>}
      {items.map((item) => {
        const f = (item.feedback ?? {}) as { scores?: Record<string, number>; strengths_ar?: string; corrections?: { wrong: string; right: string }[]; errors?: { text: string; correction: string }[] };
        const fixes = f.corrections?.map((c) => [c.wrong, c.right]) ?? f.errors?.map((e) => [e.text, e.correction]) ?? [];
        const agreed = reviewed.get(`${item.type}:${item.id}`);
        return (
          <Card key={`${item.type}-${item.id}`} className="flex flex-col gap-3 p-5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded-full bg-muted px-2.5 py-1 font-semibold text-subtle">{item.type === "speaking" ? "محادثة" : "كتابة"}</span>
              <En>{item.model}</En> · <En>{item.version}</En> · تقديري <En>{item.cefr}</En>
              {agreed !== undefined && <span className="font-semibold text-primary">{agreed ? "· وافقت" : "· لم توافق"}</span>}
            </div>
            <En as="p" className="font-semibold">
              {item.prompt}
            </En>
            <En as="p" className="rounded-xl bg-background p-3 text-sm leading-relaxed whitespace-pre-wrap">
              {item.text}
            </En>
            <div className="flex flex-wrap gap-2 text-sm" dir="ltr">
              {Object.entries(f.scores ?? {}).map(([k, v]) => (
                <span key={k} className="rounded-lg bg-ai-tint px-2.5 py-1 font-en text-ai">
                  {k}: {v}/5
                </span>
              ))}
            </div>
            {fixes.length > 0 && (
              <ul className="flex flex-col gap-1 text-sm">
                {fixes.map(([wrong, right], i) => (
                  <li key={i}>
                    <En className="text-destructive">{wrong}</En> ← <En className="text-success">{right}</En>
                  </li>
                ))}
              </ul>
            )}
            <AiReviewForm attemptType={item.type} attemptId={item.id} />
          </Card>
        );
      })}
    </div>
  );
}
