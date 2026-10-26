import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Circle, Clock, PenLine, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireSession } from "@/lib/auth/session";
import { isStep1Complete } from "@/lib/auth/routing";
import { SiteHeaderMinimal } from "@/components/site/site-header-minimal";

export const metadata: Metadata = { title: "حالة طلبك" };

type StepState = "done" | "now" | "todo";

function StepRow({ state, children }: { state: StepState; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 border-b border-muted py-3 text-sm last:border-b-0">
      {state === "done" ? (
        <CheckCircle2 className="size-5 text-success" aria-label="تم" />
      ) : state === "now" ? (
        <Clock className="size-5 text-warning" aria-label="الآن" />
      ) : (
        <Circle className="size-5 text-[#9AA8A4]" aria-label="لاحقاً" />
      )}
      <span className={`flex-1 ${state === "now" ? "font-semibold" : ""}`}>{children}</span>
      {state === "now" && <Badge tone="warning">الآن</Badge>}
    </div>
  );
}

export default async function ApplyStatusPage() {
  const { profile, application } = await requireSession("/apply/status");
  if (profile?.role === "admin") redirect("/admin");
  if (profile?.status === "active") redirect("/student");
  if (!application || application.status === "draft") redirect(profile && isStep1Complete(profile) ? "/apply/goal" : "/apply");

  const firstName = profile?.full_name.split(" ")[0] ?? "";
  const suspended = profile?.status === "suspended";
  const status = application.status;

  const view = suspended
    ? {
        icon: <XCircle className="size-9" aria-hidden="true" />,
        tint: "bg-destructive-tint text-destructive",
        title: "حسابك موقوف",
        text: "أُوقف حسابك مؤقتاً. إن كان هذا خطأً، تواصل مع فريق رفد.",
      }
    : status === "needs_changes"
      ? {
          icon: <PenLine className="size-9" aria-hidden="true" />,
          tint: "bg-warning-tint text-warning",
          title: "طلبك يحتاج تعديلاً",
          text: `شكراً يا ${firstName}. راجع ملاحظة الفريق، وعدّل طلبك ثم أرسله من جديد.`,
        }
      : status === "rejected"
        ? {
            icon: <XCircle className="size-9" aria-hidden="true" />,
            tint: "bg-destructive-tint text-destructive",
            title: "لم يُقبل طلبك هذه المرة",
            text: "نعتذر. اقرأ ملاحظة الفريق أدناه.",
          }
        : {
            icon: <Clock className="size-9" aria-hidden="true" />,
            tint: "bg-warning-tint text-warning",
            title: "طلبك قيد المراجعة",
            text: `شكراً يا ${firstName}. نراجع الطلبات خلال 3 أيام عادةً، وسنرسل لك القرار بالبريد وداخل المنصة.`,
          };

  return (
    <>
      <SiteHeaderMinimal />
      <main className="mx-auto flex w-full max-w-[520px] flex-col items-center gap-3.5 px-4 py-7 text-center">
        <span className={`flex size-[72px] items-center justify-center rounded-full ${view.tint}`}>{view.icon}</span>
        <h1 className="text-2xl font-bold">{view.title}</h1>
        <p className="text-[15px] leading-[1.9] text-muted-foreground">{view.text}</p>

        {application.review_note && (status === "needs_changes" || status === "rejected") && (
          <Card className="w-full p-4 text-start">
            <p className="mb-1 text-xs font-semibold text-muted-foreground">ملاحظة فريق الإدارة</p>
            <p className="text-[15px] leading-relaxed">{application.review_note}</p>
          </Card>
        )}

        <Card className="w-full px-4 py-1.5 text-start">
          <StepRow state="done">إنشاء الحساب</StepRow>
          <StepRow state={status === "needs_changes" ? "now" : "done"}>البيانات والهدف والموافقات</StepRow>
          <StepRow state={status === "needs_changes" ? "now" : "done"}>توصية المعلم</StepRow>
          <StepRow state={status === "submitted" ? "now" : status === "needs_changes" ? "todo" : "done"}>مراجعة الطلب</StepRow>
          <StepRow state="todo">اختبار تحديد المستوى</StepRow>
        </Card>

        {status === "needs_changes" && (
          <Button asChild className="w-full">
            <Link href="/apply/goal">عدّل طلبك</Link>
          </Button>
        )}
        {status === "submitted" && (
          <p className="text-[13px] text-muted-foreground">اختبار تحديد المستوى يُفتح قريباً، وسنبلغك عندما يجهز.</p>
        )}
        <form action="/auth/signout" method="post" className="w-full">
          <Button type="submit" variant="secondary" className="w-full">
            تسجيل الخروج
          </Button>
        </form>
      </main>
    </>
  );
}
