import Link from "next/link";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex min-h-16 max-w-[1200px] items-center justify-between gap-4 px-4 md:min-h-[76px] md:px-6">
        <Link href="/" aria-label="رفد — الرئيسية" className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element -- tiny static SVG, no optimisation needed */}
          <img src="/brand/raved-logo-green.svg" alt="شعار رفد" width={34} height={40} className="h-10 w-auto md:h-12" />
        </Link>
        <nav aria-label="القائمة الرئيسية" className="hidden gap-7 md:flex">
          <Link href="/paths" className="font-medium text-subtle no-underline hover:text-foreground">
            المسارات
          </Link>
          <Link href="/paths/english" className="font-medium text-subtle no-underline hover:text-foreground">
            الإنجليزي
          </Link>
          <Link href="/#faq" className="font-medium text-subtle no-underline hover:text-foreground">
            الأسئلة الشائعة
          </Link>
        </nav>
        <div className="flex gap-3">
          <Button asChild variant="secondary" size="sm" className="md:px-[18px] md:text-[15px]">
            <Link href="/login">
              <span className="md:hidden">دخول</span>
              <span className="hidden md:inline">تسجيل الدخول</span>
            </Link>
          </Button>
          <Button asChild variant="accent" className="hidden md:inline-flex">
            <Link href="/signup">ابدأ مجاناً</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
