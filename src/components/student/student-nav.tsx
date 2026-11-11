"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/** The tab icons of the flows library: a drop (today), a book, cards, a target, a person. */
const icon = (paths: React.ReactNode) =>
  function TabIcon({ className, strokeWidth = 2 }: { className?: string; strokeWidth?: number }) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
      >
        {paths}
      </svg>
    );
  };
const Home = icon(<path d="M12 3C12 3 5 12 5 15.5a7 7 0 0 0 14 0C19 12 12 3 12 3Z" />);
const BookOpen = icon(<path d="M4 5h6a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H4zM20 5h-6a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h6z" />);
const Languages = icon(
  <>
    <rect x="4" y="6" width="12" height="15" rx="3" />
    <path d="M8 3h9a3 3 0 0 1 3 3v12" />
  </>,
);
const Dumbbell = icon(
  <>
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="3.5" />
  </>,
);
const User = icon(
  <>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c1.5-4.5 14.5-4.5 16 0" />
  </>,
);

const TABS = [
  { href: "/student", label: "اليوم", icon: Home, match: (p: string) => p === "/student" },
  {
    href: "/student/learn",
    label: "التعلّم",
    icon: BookOpen,
    match: (p: string) => p.startsWith("/student/learn") || p.startsWith("/student/quiz") || /^\/student\/(?!vocab|practice|settings)[^/]+/.test(p),
  },
  { href: "/student/vocab", label: "المفردات", icon: Languages, match: (p: string) => p.startsWith("/student/vocab") },
  { href: "/student/practice", label: "التدريب", icon: Dumbbell, match: (p: string) => p.startsWith("/student/practice") },
  { href: "/student/settings", label: "حسابي", icon: User, match: (p: string) => p.startsWith("/student/settings") },
];

/** Bottom tabs on phones (design: StudentHomeM), side menu on desktop. */
export function StudentNav({ learnHref }: { learnHref: string }) {
  const pathname = usePathname();
  const tabs = TABS.map((t) => (t.href === "/student/learn" ? { ...t, href: learnHref } : t));
  return (
    <>
      <nav
        aria-label="التنقل الرئيسي"
        className="fixed inset-x-0 bottom-0 z-20 grid h-[var(--bn)] grid-cols-5 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {tabs.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={label}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-12 flex-col items-center justify-center gap-0.5 text-[10.5px] font-semibold no-underline",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className={cn("size-6", active && "motion-safe:animate-[tab-hop_.35s_ease-out]")} strokeWidth={active ? 2.4 : 2} />
              {label}
            </Link>
          );
        })}
      </nav>
      <nav aria-label="التنقل الرئيسي" className="hidden w-60 flex-none flex-col gap-1 border-e border-border bg-card p-4 md:flex">
        <Link href="/student" className="mb-4 px-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- tiny static SVG */}
          <img src="/brand/raved-logo-green.svg" alt="شعار رفد" width={41} height={48} className="h-12 w-auto" />
        </Link>
        {tabs.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={label}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-xl px-3.5 text-[15px] font-medium no-underline",
                active ? "bg-primary-tint font-semibold text-primary-hover" : "text-subtle hover:bg-background hover:text-foreground",
              )}
            >
              <Icon className="size-5" />
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
