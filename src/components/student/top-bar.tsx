import Link from "next/link";
import { ArrowRight } from "lucide-react";

/** Page header with a back arrow (design: .top). */
export function TopBar({ backHref, subtitle, title, children }: { backHref: string; subtitle?: React.ReactNode; title: React.ReactNode; children?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-card px-2 pt-2 pb-2.5">
      <Link href={backHref} aria-label="رجوع" className="flex size-11 flex-none items-center justify-center text-foreground">
        <ArrowRight className="size-6" aria-hidden="true" />
      </Link>
      <div className="min-w-0 flex-1">
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        <p className="truncate text-base font-bold">{title}</p>
      </div>
      {children}
    </header>
  );
}
