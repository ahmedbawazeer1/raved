import type { Metadata } from "next";
import Link from "next/link";
import { Lightbulb } from "lucide-react";
import { PathCard } from "@/components/paths/path-card";
import { getPublicPaths } from "@/lib/paths/queries";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "المسارات التعليمية",
  description: "كل مسار مقسم إلى مستويات ووحدات قصيرة، مع اختبارات وشهادة إتمام لكل مستوى.",
};

export const revalidate = 300;

const FILTERS = [
  { key: "all", label: "الكل" },
  { key: "published", label: "متاحة" },
  { key: "soon", label: "قريباً" },
] as const;

export default async function PathsPage({ searchParams }: PageProps<"/paths">) {
  const { f } = await searchParams;
  const filter = FILTERS.find((x) => x.key === f)?.key ?? "all";
  const all = await getPublicPaths();
  const shown = filter === "all" ? all : all.filter((p) => p.status === filter);
  const count = (key: string) => (key === "all" ? all.length : all.filter((p) => p.status === key).length);
  const firstPublished = shown.find((p) => p.status === "published");

  return (
    <main className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 py-7 md:px-6 md:py-14">
      <div>
        <h1 className="text-2xl font-bold md:text-[34px]">المسارات التعليمية</h1>
        <p className="mt-1.5 text-[15px] text-muted-foreground md:text-base">
          كل مسار مقسم إلى مستويات ووحدات قصيرة، مع اختبارات وشهادة إتمام لكل مستوى
        </p>
      </div>
      <nav aria-label="تصفية المسارات" className="flex flex-wrap gap-2">
        {FILTERS.map((x) => (
          <Link
            key={x.key}
            href={x.key === "all" ? "/paths" : `/paths?f=${x.key}`}
            aria-current={filter === x.key ? "page" : undefined}
            className={cn(
              "inline-flex min-h-9 items-center rounded-full px-3.5 text-[13px] font-semibold no-underline",
              filter === x.key ? "bg-primary-tint text-primary-hover" : "bg-muted text-subtle hover:text-foreground",
            )}
          >
            {x.label} ({count(x.key)})
          </Link>
        ))}
      </nav>
      <div className="flex flex-col gap-2.5 md:flex-row md:flex-wrap md:gap-4">
        {shown.map((p) => (
          <PathCard key={p.id} path={p} featured={p === firstPublished} />
        ))}
        {shown.length === 0 && <p className="text-muted-foreground">لا توجد مسارات هنا بعد.</p>}
      </div>
      <div className="flex flex-col items-start gap-3 rounded-2xl border border-border bg-card p-5 md:flex-row md:items-center">
        <span className="flex size-11 flex-none items-center justify-center rounded-xl bg-warning-tint text-warning">
          <Lightbulb className="size-5" aria-hidden="true" />
        </span>
        <p className="flex-1 text-[15px] leading-relaxed">
          تقترح مساراً جديداً؟ أخبرنا بالمهارة التي تحتاجها، فالمسارات القادمة نختارها حسب طلب الطلاب.
        </p>
      </div>
    </main>
  );
}
