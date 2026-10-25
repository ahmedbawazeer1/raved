import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card py-7">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 px-4 md:px-6">
        {/* eslint-disable-next-line @next/next/no-img-element -- tiny static SVG */}
        <img src="/brand/raved-logo-green.svg" alt="شعار رفد" width={34} height={40} className="h-10 w-auto" />
        <p className="text-sm text-muted-foreground">
          رفد — منصة تعليمية مجانية لطلاب اليمن · <Link href="/privacy">الخصوصية</Link> ·{" "}
          <Link href="/terms">الشروط</Link> · <Link href="/verify">تحقق من شهادة</Link>
        </p>
      </div>
    </footer>
  );
}
