import Link from "next/link";

/** Logo-only header for onboarding and simple pages. */
export function SiteHeaderMinimal({ action }: { action?: React.ReactNode }) {
  return (
    <header className="flex items-center justify-between border-b border-border bg-card px-4 py-2.5 print:hidden">
      <Link href="/" aria-label="رفد — الرئيسية">
        {/* eslint-disable-next-line @next/next/no-img-element -- tiny static SVG */}
        <img src="/brand/raved-logo-green.svg" alt="شعار رفد" width={34} height={40} className="h-10 w-auto" />
      </Link>
      {action}
    </header>
  );
}
