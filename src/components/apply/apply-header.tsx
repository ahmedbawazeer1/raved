import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function ApplyHeader({ step, title, backHref }: { step: 1 | 2; title: string; backHref: string }) {
  return (
    <>
      <header className="flex items-center gap-2 border-b border-border bg-card px-2 pt-2 pb-2.5">
        <Link href={backHref} aria-label="رجوع" className="flex size-11 flex-none items-center justify-center text-foreground">
          <ArrowRight className="size-6" aria-hidden="true" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">الخطوة {step} من 2</p>
          <p className="text-base font-bold">{title}</p>
        </div>
      </header>
      <div className="mx-auto grid w-full max-w-2xl grid-cols-2 gap-1.5 px-4 pt-2.5" aria-hidden="true">
        <span className="h-1.5 rounded-full bg-primary" />
        <span className={`h-1.5 rounded-full ${step === 2 ? "bg-primary" : "bg-border"}`} />
      </div>
    </>
  );
}
