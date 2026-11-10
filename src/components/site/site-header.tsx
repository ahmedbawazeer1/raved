import Link from "next/link";
import { Button } from "@/components/ui/button";

/** Public header: stays on top while scrolling, with the main action always one tap away. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex min-h-16 max-w-[1200px] items-center justify-between gap-4 px-4 md:min-h-[72px] md:px-6">
        <Link href="/" aria-label="رفد — الرئيسية" className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element -- tiny static SVG, no optimisation needed */}
          <img src="/brand/raved-logo-green.svg" alt="شعار رفد" width={34} height={40} className="h-10 w-auto md:h-11" />
        </Link>
        <nav aria-label="القائمة الرئيسية" className="hidden gap-7 md:flex">
          <Link href="/paths" className="font-semibold text-subtle no-underline hover:text-primary">
            المسارات
          </Link>
          <Link href="/paths/english" className="font-semibold text-subtle no-underline hover:text-primary">
            الإنجليزي
          </Link>
          <Link href="/#faq" className="font-semibold text-subtle no-underline hover:text-primary">
            الأسئلة الشائعة
          </Link>
        </nav>
        <div className="flex items-center gap-2 md:gap-3">
          <Link href="/login" className="px-2 font-bold text-primary no-underline hover:text-primary-hover">
            <span className="md:hidden">دخول</span>
            <span className="hidden md:inline">تسجيل الدخول</span>
          </Link>
          <Button asChild variant="accent" className="shadow-[0_4px_0_#C98210] active:translate-y-1 active:shadow-none">
            <Link href="/signup">ابدأ مجاناً</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
