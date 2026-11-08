"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  BadgeCheck,
  Bot,
  Factory,
  FileJson,
  Flag,
  GraduationCap,
  Inbox,
  LayoutGrid,
  Layers,
  LayoutTemplate,
  LineChart,
  Route,
  Settings,
  Sparkles,
  Sun,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type NavBadges = { review: number; applications: number; reports: number };
type Item = { href: string; label: string; icon: LucideIcon; badge?: keyof NavBadges; exact?: boolean; also?: string[] };
type Group = { title: string; items: Item[] };

const ADMIN: Group[] = [
  {
    title: "عام",
    items: [
      { href: "/admin", label: "اليوم", icon: Sun, exact: true },
      { href: "/studio/review", label: "المراجعة", icon: BadgeCheck, badge: "review" },
      { href: "/admin/reports", label: "البلاغات والتقارير", icon: Flag, badge: "reports" },
    ],
  },
  {
    title: "الطلاب",
    items: [
      { href: "/admin/applications", label: "طلبات الالتحاق", icon: Inbox, badge: "applications" },
      { href: "/admin/students", label: "الطلاب", icon: Users },
      { href: "/admin/teachers", label: "المعلمون", icon: GraduationCap },
    ],
  },
  {
    title: "المحتوى",
    items: [
      { href: "/studio", label: "الاستوديو", icon: Layers, exact: true, also: ["/studio/paths", "/studio/levels", "/studio/units"] },
      { href: "/studio/line", label: "خط الإنتاج", icon: Factory },
      { href: "/studio/templates", label: "القوالب", icon: LayoutTemplate },
      { href: "/studio/insights", label: "نتائج الوحدات", icon: LineChart },
    ],
  },
  {
    title: "المنصة",
    items: [
      { href: "/admin/agent", label: "عقل رفد", icon: Bot },
      { href: "/admin/ai-review", label: "مراجعة التقييم الآلي", icon: Sparkles },
      { href: "/admin/settings", label: "الإعدادات", icon: Settings },
    ],
  },
  {
    title: "أدوات أخرى",
    items: [
      { href: "/admin/paths", label: "نشر المسارات", icon: Route },
      { href: "/admin/content", label: "حزم المحتوى القديمة", icon: FileJson },
    ],
  },
];

const TEACHER: Group[] = [
  {
    title: "عملي",
    items: [
      { href: "/studio/review", label: "المراجعة", icon: BadgeCheck, badge: "review" },
      { href: "/studio", label: "الاستوديو", icon: Layers, exact: true, also: ["/studio/paths", "/studio/levels", "/studio/units"] },
      { href: "/studio/line", label: "خط الإنتاج", icon: Factory },
      { href: "/studio/templates", label: "القوالب", icon: LayoutTemplate },
      { href: "/studio/insights", label: "نتائج الوحدات", icon: LineChart },
    ],
  },
];

/** The bottom tabs on phones: the four most used places, the rest under «المزيد». */
const TABS_ADMIN = ["/admin", "/studio/review", "/studio", "/admin/applications"];
const TABS_TEACHER = ["/studio/review", "/studio", "/studio/templates"];
const TAB_LABEL: Record<string, string> = { "/admin/applications": "الطلاب" };

const allItems = (groups: Group[]) => groups.flatMap((g) => g.items);

function activeHref(pathname: string, items: Item[]): string | null {
  let best: Item | null = null;
  for (const it of items) {
    const hit = it.exact
      ? pathname === it.href || (it.also ?? []).some((p) => pathname.startsWith(p))
      : pathname === it.href || pathname.startsWith(`${it.href}/`);
    if (hit && (!best || it.href.length > best.href.length)) best = it;
  }
  return best?.href ?? null;
}

function Badge({ n }: { n: number }) {
  if (!n) return null;
  return <span className="ms-auto rounded-full bg-accent px-2 font-en text-xs leading-5 font-bold text-accent-foreground">{n > 99 ? "99+" : n}</span>;
}

export function SideNav({ isAdmin, badges }: { isAdmin: boolean; badges: NavBadges }) {
  const pathname = usePathname();
  const groups = isAdmin ? ADMIN : TEACHER;
  const active = activeHref(pathname, allItems(groups));
  return (
    <nav aria-label="القائمة" className="flex flex-col gap-0.5">
      {groups.map((g) => (
        <div key={g.title} className="flex flex-col gap-0.5">
          <p className="px-3 pt-3 pb-1 text-xs font-semibold text-[#8A9C97]">{g.title}</p>
          {g.items.map(({ href, label, icon: Icon, badge }) => (
            <Link
              key={href}
              href={href}
              aria-current={active === href ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium no-underline",
                active === href
                  ? "bg-[rgba(63,183,156,0.18)] font-semibold text-white shadow-[inset_-3px_0_0_#3FB79C] hover:text-white"
                  : "text-[#C3D1CD] hover:bg-[#1A2B27] hover:text-white",
              )}
            >
              <Icon className="size-5" aria-hidden="true" />
              {label}
              {badge && <Badge n={badges[badge]} />}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}

export function MobileTabs({ isAdmin, badges }: { isAdmin: boolean; badges: NavBadges }) {
  const pathname = usePathname();
  const groups = isAdmin ? ADMIN : TEACHER;
  const items = allItems(groups);
  const tabs = (isAdmin ? TABS_ADMIN : TABS_TEACHER).map((h) => items.find((i) => i.href === h)!);
  const active = activeHref(pathname, items);
  const [open, setOpen] = useState(false);
  const firstRef = useRef<HTMLAnchorElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  const studentsGroup = ["/admin/applications", "/admin/students", "/admin/teachers"];
  const tabActive = (href: string) => active === href || (href === "/admin/applications" && !!active && studentsGroup.includes(active));
  const moreActive = !!active && !tabs.some((t) => tabActive(t.href));

  useEffect(() => {
    if (!open) return;
    firstRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        moreRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const rest = items.filter((i) => !tabs.includes(i));
  return (
    <>
      <nav
        aria-label="التنقل السريع"
        className={cn(
          "fixed inset-x-0 bottom-0 z-30 grid border-t border-border bg-card px-1 pt-1.5 pb-[calc(6px+env(safe-area-inset-bottom))] md:hidden",
          tabs.length === 4 ? "grid-cols-5" : "grid-cols-4",
        )}
      >
        {tabs.map(({ href, label, icon: Icon, badge }) => {
          const on = tabActive(href);
          const n = badge ? badges[badge] : 0;
          return (
            <Link
              key={href}
              href={href}
              aria-current={on ? "page" : undefined}
              className={cn(
                "relative flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-xl text-xs font-semibold no-underline",
                on ? "text-primary hover:text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span className={cn("flex h-7 w-12 items-center justify-center rounded-full", on && "bg-primary-tint")}>
                <Icon className="size-5" aria-hidden="true" />
              </span>
              {TAB_LABEL[href] ?? label}
              {n > 0 && (
                <span className="absolute top-0.5 start-[calc(50%+8px)] rounded-full bg-accent px-1.5 font-en text-[11px] leading-[17px] font-bold text-accent-foreground">
                  {n}
                </span>
              )}
            </Link>
          );
        })}
        <button
          ref={moreRef}
          type="button"
          aria-expanded={open}
          aria-controls="more-sheet"
          onClick={() => setOpen(true)}
          className={cn(
            "flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-xl text-xs font-semibold",
            moreActive ? "text-primary" : "text-muted-foreground",
          )}
        >
          <span className={cn("flex h-7 w-12 items-center justify-center rounded-full", moreActive && "bg-primary-tint")}>
            <LayoutGrid className="size-5" aria-hidden="true" />
          </span>
          المزيد
        </button>
      </nav>
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button type="button" aria-label="إغلاق" className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div
            id="more-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="المزيد"
            className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-[22px] bg-card px-4 pt-3 pb-[calc(16px+env(safe-area-inset-bottom))]"
          >
            <div className="mb-3 flex items-center justify-between">
              <b>المزيد</b>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="إغلاق"
                className="flex size-11 items-center justify-center rounded-xl text-muted-foreground"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {rest.map(({ href, label, icon: Icon, badge }, i) => (
                <Link
                  key={href}
                  ref={i === 0 ? firstRef : undefined}
                  href={href}
                  onClick={() => setOpen(false)}
                  aria-current={active === href ? "page" : undefined}
                  className={cn(
                    "relative flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-background px-1.5 py-3.5 text-center text-[13px] font-semibold text-foreground no-underline hover:text-foreground",
                    active === href && "border-primary",
                  )}
                >
                  <span className="flex size-10 items-center justify-center rounded-xl bg-primary-tint text-primary">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  {label}
                  {badge && badges[badge] > 0 && (
                    <span className="absolute top-1.5 end-1.5 rounded-full bg-accent px-1.5 font-en text-[11px] leading-[17px] font-bold text-accent-foreground">
                      {badges[badge]}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
