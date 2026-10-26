import Link from "next/link";
import { cn } from "@/lib/utils";

export interface LegalSection {
  title: string;
  body: string;
}

/** Simple-language policy page (design: Legal, LegalM). */
export function LegalPage({
  current,
  title,
  updated,
  sections,
}: {
  current: "privacy" | "terms";
  title: string;
  updated: string;
  sections: LegalSection[];
}) {
  const tabs = [
    { key: "privacy", href: "/privacy", label: "سياسة الخصوصية" },
    { key: "terms", href: "/terms", label: "شروط الاستخدام" },
  ] as const;
  return (
    <main className="mx-auto flex max-w-[760px] flex-col gap-5 px-4 py-7 md:py-12">
      <nav aria-label="الصفحات القانونية" className="flex gap-2">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            aria-current={current === t.key ? "page" : undefined}
            className={cn(
              "inline-flex min-h-10 items-center rounded-full px-4 text-sm font-semibold no-underline",
              current === t.key ? "bg-primary-tint text-primary-hover" : "bg-muted text-subtle",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <div>
        <h1 className="text-2xl font-bold md:text-[32px]">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">آخر تحديث: {updated} · بلغة بسيطة</p>
      </div>
      <div className="rounded-2xl border border-border bg-card p-5 md:p-7">
        {sections.map((s) => (
          <section key={s.title} className="border-b border-muted py-4 first:pt-0 last:border-b-0 last:pb-0">
            <h2 className="mb-1.5 text-lg font-bold">{s.title}</h2>
            <p className="text-[15px] leading-[1.9] text-subtle">{s.body}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
