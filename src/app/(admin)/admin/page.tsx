import Link from "next/link";
import { Card } from "@/components/ui/card";
import { En } from "@/components/en";
import { daysAgoIso } from "@/lib/admin/reports";
import { quotaStatus, yemenDay } from "@/lib/ai/limits";
import { createClient } from "@/lib/supabase/server";

export default async function AdminHomePage() {
  const supabase = await createClient();
  const weekAgo = daysAgoIso(7);
  const [pending, active, paths, waitlist, inReview, openReports, broken, activeWeek, enrollments, usage, quotas] = await Promise.all([
    supabase.from("applications").select("id", { count: "exact", head: true }).eq("status", "submitted"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "active").eq("role", "student"),
    supabase.from("paths").select("id", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("path_waitlist").select("id", { count: "exact", head: true }).is("notified_at", null),
    supabase.from("units").select("id", { count: "exact", head: true }).eq("status", "review"),
    supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("sources").select("id", { count: "exact", head: true }).eq("status", "broken"),
    supabase.from("lesson_progress").select("student_id").gte("updated_at", weekAgo),
    supabase.from("enrollments").select("levels!enrollments_current_level_id_fkey(code), profiles!inner(status, role)").eq("is_primary", true).eq("profiles.status", "active").eq("profiles.role", "student"),
    supabase.from("ai_usage").select("feature, ok").eq("day", yemenDay()),
    quotaStatus(),
  ]);

  const kpis = [
    { label: "طلاب نشطون", value: active.count ?? 0, href: "/admin/students" },
    { label: "درسوا هذا الأسبوع", value: new Set((activeWeek.data ?? []).map((r) => r.student_id)).size, href: "/admin/reports" },
    { label: "مسارات منشورة", value: paths.count ?? 0, href: "/admin/paths" },
    { label: "في قوائم الانتظار", value: waitlist.count ?? 0, href: "/admin/paths" },
  ];
  const todos = [
    { label: "طلبات التحاق تنتظر المراجعة", count: pending.count ?? 0, href: "/admin/applications" },
    { label: "وحدات تنتظر المراجعة", count: inReview.count ?? 0, href: "/admin/content" },
    { label: "بلاغات مفتوحة من الطلاب", count: openReports.count ?? 0, href: "/admin/reports" },
    { label: "روابط فيديو معطّلة", count: broken.count ?? 0, href: "/admin/reports#videos" },
  ];
  const byLevel = new Map<string, number>();
  for (const e of enrollments.data ?? []) {
    const code = e.levels?.code ?? "لم يحدد";
    byLevel.set(code, (byLevel.get(code) ?? 0) + 1);
  }
  const usageRows = ["speaking", "writing", "assistant", "transcription"].map((f) => ({
    feature: f,
    ok: (usage.data ?? []).filter((u) => u.feature === f && u.ok).length,
    failed: (usage.data ?? []).filter((u) => u.feature === f && !u.ok).length,
  }));
  const FEATURE_AR: Record<string, string> = { speaking: "المحادثة", writing: "الكتابة", assistant: "المساعد", transcription: "تحويل الكلام إلى نص" };

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-[28px] font-bold">الرئيسية</h1>
      {quotas
        .filter((q) => q.alert)
        .map((q) => (
          <Link key={q.provider} href="/admin/ai-review" className="rounded-2xl bg-warning-tint p-4 text-sm font-semibold text-[#5C3D00] no-underline">
            تنبيه: استُهلك {q.percent}% من الحصة المجانية اليومية لـ <span className="font-en">{q.provider}</span> ({q.requests} من {q.quota} طلب). قد يتوقف التقييم الآلي قبل نهاية اليوم.
          </Link>
        ))}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <Link
            key={k.label}
            href={k.href}
            className="flex flex-col gap-1 rounded-2xl border border-border bg-card p-[18px] text-foreground no-underline hover:border-primary hover:text-foreground"
          >
            <span className="text-sm text-muted-foreground">{k.label}</span>
            <span className="font-en text-3xl font-bold">{k.value}</span>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-2 text-lg font-bold">مطلوب منك</h2>
          {todos.map((t) => (
            <Link
              key={t.label}
              href={t.href}
              className="flex min-h-11 items-center gap-3 border-b border-muted py-2 text-[15px] text-foreground no-underline last:border-b-0 hover:text-foreground"
            >
              <span className="flex-1">{t.label}</span>
              <span className={`rounded-full px-2.5 font-en text-sm leading-6 font-bold ${t.count ? "bg-accent text-accent-foreground" : "bg-muted text-subtle"}`}>
                {t.count}
              </span>
            </Link>
          ))}
        </Card>

        <Card className="p-5">
          <h2 className="mb-2 text-lg font-bold">الطلاب حسب المستوى</h2>
          {byLevel.size === 0 ? (
            <p className="text-sm text-muted-foreground">لا يوجد طلاب نشطون بعد.</p>
          ) : (
            [...byLevel.entries()].sort().map(([level, n]) => (
              <div key={level} className="flex items-center justify-between border-b border-muted py-2 text-[15px] last:border-b-0">
                <En>{level}</En>
                <span className="font-en font-semibold">{n}</span>
              </div>
            ))
          )}
        </Card>

        <Card className="p-5 lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-bold">الذكاء الاصطناعي اليوم</h2>
            <Link href="/admin/ai-review" className="text-sm">
              المراجعة الشهرية ←
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {usageRows.map((u) => (
              <div key={u.feature} className="rounded-xl bg-background p-3 text-sm">
                <p className="text-muted-foreground">{FEATURE_AR[u.feature]}</p>
                <p className="font-en text-xl font-bold">{u.ok}</p>
                {u.failed > 0 && <p className="text-xs text-destructive">{u.failed} فشلت</p>}
              </div>
            ))}
          </div>
          {quotas.map((q) => (
            <p key={q.provider} className="mt-3 text-sm text-muted-foreground">
              الحصة المجانية: <En>{q.provider}</En> {q.requests} من {q.quota} طلب اليوم ({q.percent}%).
            </p>
          ))}
        </Card>
      </div>
    </div>
  );
}
