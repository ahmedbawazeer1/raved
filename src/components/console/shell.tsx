import Link from "next/link";
import { OctagonAlert } from "lucide-react";
import { reviewCount, type AgentState, type ConsoleSummary } from "@/lib/console/notices";
import { MobileTabs, SideNav } from "./nav";
import { TopBar } from "./top-bar";

const PAGES_ADMIN = [
  { label: "اليوم", href: "/admin" },
  { label: "المراجعة", href: "/studio/review" },
  { label: "البلاغات والتقارير", href: "/admin/reports" },
  { label: "طلبات الالتحاق", href: "/admin/applications" },
  { label: "الطلاب", href: "/admin/students" },
  { label: "المعلمون", href: "/admin/teachers" },
  { label: "الاستوديو", href: "/studio" },
  { label: "القوالب", href: "/studio/templates" },
  { label: "نتائج الوحدات", href: "/studio/insights" },
  { label: "عقل رفد", href: "/admin/agent" },
  { label: "الإعدادات", href: "/admin/settings" },
];
const PAGES_TEACHER = PAGES_ADMIN.filter((p) => p.href.startsWith("/studio"));

function AgentMini({ agent }: { agent: AgentState }) {
  const view =
    agent.kind === "running"
      ? {
          dot: "bg-[#3FB79C] animate-pulse",
          title: "«عقل رفد» يعمل",
          detail: `${agent.label}${agent.step ? ` · ${agent.step}` : ""}`,
          progress: agent.progress,
        }
      : agent.kind === "failed"
        ? { dot: "bg-[#F2897E]", title: "«عقل رفد» متوقف بخطأ", detail: agent.label, progress: null }
        : agent.kind === "paused"
          ? { dot: "bg-accent", title: "«عقل رفد» موقوف", detail: "شغّله من صفحته", progress: null }
          : { dot: "bg-[#8A9C97]", title: "«عقل رفد» ينتظر", detail: "لا مهام الآن", progress: null };
  return (
    <Link href="/admin/agent" className="mt-auto flex flex-col gap-2 rounded-2xl bg-[#1A2B27] p-3 text-[#C3D1CD] no-underline hover:text-[#C3D1CD]">
      <span className="flex items-center gap-2 font-semibold text-white">
        <span className={`size-2.5 flex-none rounded-full ${view.dot}`} aria-hidden="true" />
        {view.title}
      </span>
      <span className="truncate text-xs">{view.detail}</span>
      {view.progress !== null && (
        <span className="h-1.5 overflow-hidden rounded-full bg-[#0F1C19]">
          <span className="block h-full rounded-full bg-[#B69CF5]" style={{ width: `${Math.max(4, view.progress)}%` }} />
        </span>
      )}
    </Link>
  );
}

/** The one frame of the admin dashboard and the content studio (admin + teachers). */
export function ConsoleShell({ name, summary, children }: { name: string; summary: ConsoleSummary; children: React.ReactNode }) {
  const isAdmin = summary.isAdmin;
  const badges = { review: reviewCount(summary), applications: summary.pendingApplications, reports: summary.openReports };
  const roleLabel = isAdmin ? "مدير المنصة" : "معلم متطوع";
  return (
    <div className="flex min-h-dvh bg-background">
      <aside
        aria-label="القائمة الجانبية"
        className="sticky top-0 hidden h-dvh w-[252px] flex-none flex-col gap-2 overflow-y-auto bg-[#0F1C19] px-3 py-4 md:flex"
      >
        <Link href={isAdmin ? "/admin" : "/studio/review"} className="flex items-center gap-2.5 px-2 pb-1 no-underline">
          {/* eslint-disable-next-line @next/next/no-img-element -- tiny static SVG */}
          <img src="/brand/raved-logo-green-white.svg" alt="" width={34} height={40} className="h-10 w-auto" />
          <span className="leading-tight">
            <b className="block text-[17px] text-white">رفد</b>
            <span className="text-xs text-[#C3D1CD]">{isAdmin ? "لوحة الإدارة" : "استوديو المحتوى"}</span>
          </span>
        </Link>
        <SideNav isAdmin={isAdmin} badges={badges} />
        {isAdmin && <AgentMini agent={summary.agent} />}
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar name={name} roleLabel={roleLabel} notices={summary.notices} pages={isAdmin ? PAGES_ADMIN : PAGES_TEACHER} />
        {isAdmin && summary.agent.kind === "failed" && (
          <div role="alert" className="flex flex-wrap items-center gap-3 bg-destructive-tint px-4 py-3 text-sm font-semibold text-destructive md:px-6">
            <OctagonAlert className="size-5 flex-none" aria-hidden="true" />
            <span className="min-w-[200px] flex-1">توقف «عقل رفد» أثناء {summary.agent.label}. ما بُني محفوظ، ويكمل من نفس المحطة عند المحاولة التالية.</span>
            <Link href="/admin/agent" className="rounded-lg bg-card px-3 py-2 text-destructive no-underline">
              التفاصيل
            </Link>
          </div>
        )}
        <main className="mx-auto w-full max-w-[1240px] min-w-0 flex-1 px-4 pt-5 pb-28 md:px-6 md:pt-6 md:pb-14">{children}</main>
      </div>
      <MobileTabs isAdmin={isAdmin} badges={badges} />
    </div>
  );
}
