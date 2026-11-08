"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Layers, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/studio", label: "المسارات والمناهج", icon: LayoutGrid, exact: true },
  { href: "/studio/templates", label: "القوالب", icon: Layers },
];

export function StudioNav({ isAdmin, variant }: { isAdmin: boolean; variant: "sidebar" | "bar" }) {
  const pathname = usePathname();
  const items = isAdmin ? [...ITEMS, { href: "/admin", label: "لوحة الإدارة", icon: ShieldCheck, exact: false }] : ITEMS;
  return (
    <nav aria-label="تنقل الاستوديو" className={cn(variant === "sidebar" ? "flex flex-col gap-0.5" : "flex gap-1 overflow-x-auto px-2 pb-2")}>
      {items.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href || pathname.startsWith("/studio/paths") || pathname.startsWith("/studio/levels") : pathname.startsWith(href);
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
          </Link>
        );
      })}
    </nav>
  );
}
