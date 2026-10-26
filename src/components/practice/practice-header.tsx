import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { MixedText } from "@/components/mixed-text";

export function PracticeHeader({ backHref, overline, title }: { backHref: string; overline: string; title: string }) {
  return (
    <header className="flex items-center gap-2 border-b border-border bg-card px-2 py-2">
      <Link href={backHref} aria-label="رجوع" className="flex size-11 flex-none items-center justify-center rounded-full text-foreground">
        <ChevronRight className="size-[22px]" aria-hidden="true" />
      </Link>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{overline}</p>
        <h1 className="truncate text-base font-bold">
          <MixedText text={title} />
        </h1>
      </div>
    </header>
  );
}
