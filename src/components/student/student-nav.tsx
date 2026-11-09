"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Dumbbell, Home, Languages, User } from "lucide-react";
import { cn } from "@/lib/utils";

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
        className="fixed inset-x-2.5 bottom-[max(10px,env(safe-area-inset-bottom))] z-20 flex h-[64px] justify-around rounded-3xl border border-border bg-card/85 shadow-[0_10px_30px_-12px_rgba(0,0,0,.35)] backdrop-blur-md md:hidden"
      >
        {tabs.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={label}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-h-12 min-w-[60px] flex-col items-center justify-center gap-0.5 text-[11px] font-semibold no-underline",
                active
                  ? "text-primary after:absolute after:bottom-1 after:size-1.5 after:rounded-full after:bg-current"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon
                className={cn("size-6 transition-transform", active && "-translate-y-0.5 scale-110 motion-safe:animate-[tab-hop_.35s_ease-out]")}
                strokeWidth={active ? 2.4 : 2}
                aria-hidden="true"
              />
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
              <Icon className="size-5" aria-hidden="true" />
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
