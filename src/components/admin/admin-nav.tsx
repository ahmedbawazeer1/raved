"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileCheck2, Home, Route, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/admin", label: "الرئيسية", icon: Home, exact: true },
  { href: "/admin/applications", label: "طلبات الالتحاق", icon: FileCheck2, badgeKey: "applications" as const },
  { href: "/admin/paths", label: "المسارات", icon: Route },
  { href: "/admin/settings", label: "الإعدادات", icon: Settings },
];

export function AdminNav({ pendingApplications, variant }: { pendingApplications: number; variant: "sidebar" | "bar" }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="تنقل الإدارة"
      className={cn(variant === "sidebar" ? "flex flex-col gap-0.5" : "flex gap-1 overflow-x-auto px-2 pb-2")}
    >
      {ITEMS.map(({ href, label, icon: Icon, exact, badgeKey }) => {
        const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
        const badge = badgeKey === "applications" && pendingApplications > 0 ? pendingApplications : null;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 flex-none items-center gap-3 rounded-xl px-3.5 text-[15px] font-medium whitespace-nowrap no-underline",
              active ? "bg-primary font-semibold text-white hover:text-white" : "text-[#C9D4D1] hover:bg-[#1C2E2A] hover:text-white",
            )}
          >
            <Icon className="size-5" aria-hidden="true" />
            {label}
            {badge && (
              <span className="ms-auto rounded-full bg-accent px-2 text-xs leading-5 font-bold text-accent-foreground">{badge}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
