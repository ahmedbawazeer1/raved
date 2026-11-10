import Link from "next/link";

const COLS = [
  {
    title: "تعلّم",
    links: [
      { href: "/paths", label: "كل المسارات" },
      { href: "/paths/english", label: "مسار الإنجليزي" },
      { href: "/signup", label: "أنشئ حسابك" },
    ],
  },
  {
    title: "رفد",
    links: [
      { href: "/app", label: "تطبيق أندرويد" },
      { href: "/verify", label: "تحقق من شهادة" },
      { href: "/#faq", label: "الأسئلة الشائعة" },
    ],
  },
  {
    title: "الثقة",
    links: [
      { href: "/privacy", label: "الخصوصية" },
      { href: "/terms", label: "الشروط" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="bg-background py-10">
      <div className="mx-auto flex max-w-[1200px] flex-wrap justify-between gap-8 px-4 md:px-6">
        <div className="flex max-w-xs flex-col gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- tiny static SVG */}
          <img src="/brand/raved-logo-green.svg" alt="شعار رفد" width={34} height={40} className="h-11 w-auto self-start" />
          <p className="text-sm leading-relaxed text-muted-foreground">رفد — منصة تعليمية مجانية لطلاب الثانوية في اليمن. بلا اشتراك وبلا إعلانات.</p>
        </div>
        {COLS.map((c) => (
          <nav key={c.title} aria-label={c.title} className="flex flex-col gap-2 text-sm">
            <b>{c.title}</b>
            {c.links.map((l) => (
              <Link key={l.href} href={l.href} className="text-muted-foreground no-underline hover:text-primary">
                {l.label}
              </Link>
            ))}
          </nav>
        ))}
      </div>
    </footer>
  );
}
