import Link from "next/link";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { quotaStatus } from "@/lib/ai/limits";

export default async function AdminHomePage() {
  const supabase = await createClient();
  const [pending, active, paths, waitlist] = await Promise.all([
    supabase.from("applications").select("id", { count: "exact", head: true }).eq("status", "submitted"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "active").eq("role", "student"),
    supabase.from("paths").select("id", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("path_waitlist").select("id", { count: "exact", head: true }).is("notified_at", null),
  ]);

  const quotas = (await quotaStatus()).filter((q) => q.alert);

  const kpis = [
    { label: "طلبات تنتظر المراجعة", value: pending.count ?? 0, href: "/admin/applications" },
    { label: "طلاب نشطون", value: active.count ?? 0 },
    { label: "مسارات منشورة", value: paths.count ?? 0, href: "/admin/paths" },
    { label: "في قوائم الانتظار", value: waitlist.count ?? 0, href: "/admin/paths" },
  ];

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-[28px] font-bold">الرئيسية</h1>
      {quotas.map((q) => (
        <Link key={q.provider} href="/admin/ai-review" className="rounded-2xl bg-warning-tint p-4 text-sm font-semibold text-[#5C3D00] no-underline">
          تنبيه: استُهلك {q.percent}% من الحصة المجانية اليومية لـ <span className="font-en">{q.provider}</span> ({q.requests} من {q.quota} طلب). قد يتوقف التقييم الآلي قبل نهاية اليوم.
        </Link>
      ))}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => {
          const body = (
            <>
              <span className="text-sm text-muted-foreground">{k.label}</span>
              <span className="font-en text-3xl font-bold">{k.value}</span>
            </>
          );
          return k.href ? (
            <Link key={k.label} href={k.href} className="flex flex-col gap-1 rounded-2xl border border-border bg-card p-[18px] text-foreground no-underline hover:border-primary hover:text-foreground">
              {body}
            </Link>
          ) : (
            <Card key={k.label} className="flex flex-col gap-1 p-[18px]">
              {body}
            </Card>
          );
        })}
      </div>
      <Card className="p-5 text-sm leading-relaxed text-muted-foreground">
        المحتوى والطلاب والتقارير واستهلاك الذكاء الاصطناعي تظهر هنا في المراحل القادمة.
      </Card>
    </div>
  );
}
