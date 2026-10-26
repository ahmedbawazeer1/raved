import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { En } from "@/components/en";
import { PathIcon } from "@/components/site/path-icon";
import type { PublicPath } from "@/lib/paths/queries";

/** Path card for the catalog and landing page (design: Paths, Landing). */
export function PathCard({ path, featured }: { path: PublicPath; featured?: boolean }) {
  if (featured) {
    const general = path.levels.filter((l) => l.kind === "general");
    const hasExam = path.features.exam_track || path.levels.some((l) => l.kind === "exam");
    return (
      <Link
        href={`/paths/${path.slug}`}
        className="flex gap-3 rounded-2xl border-2 border-primary bg-card p-4 text-foreground no-underline hover:text-foreground md:flex-[2_1_420px] md:flex-col md:p-[26px]"
      >
        <div className="flex shrink-0 items-center justify-between">
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-white md:size-[52px] md:rounded-[14px]">
            <PathIcon name={path.icon} className="size-[22px] md:size-[26px]" />
          </span>
          <Badge tone="warning" className="hidden md:inline-flex">
            المسار الأهم الآن
          </Badge>
        </div>
        <div className="flex flex-1 flex-col gap-1 md:gap-3">
          <p className="font-bold md:text-[22px]">{path.title}</p>
          <p className="hidden text-[15px] leading-[1.8] text-muted-foreground md:block">
            <En>{path.summary}</En>
          </p>
          {general.length > 0 && (
            <div className="hidden flex-wrap gap-1.5 md:flex">
              {general.map((l) => (
                <Badge key={l.id}>
                  <En>{l.code}</En>
                </Badge>
              ))}
              {hasExam && <Badge tone="warning">مسار الامتحان</Badge>}
            </div>
          )}
          {path.duration && (
            <p className="text-[13px] text-muted-foreground md:mt-auto md:text-sm md:font-semibold md:text-primary">
              {path.duration} <span className="hidden md:inline">←</span>
            </p>
          )}
        </div>
        <Badge tone="warning" className="md:hidden">
          متاح
        </Badge>
      </Link>
    );
  }

  const soon = path.status === "soon";
  return (
    <Link
      href={`/paths/${path.slug}`}
      className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 text-foreground no-underline hover:text-foreground md:flex-[1_1_240px] md:flex-col md:items-stretch md:gap-2.5 md:p-[22px]"
    >
      <div className="flex shrink-0 items-center justify-between">
        <span className="flex size-10 items-center justify-center rounded-xl bg-muted text-subtle md:size-11">
          <PathIcon name={path.icon} className="size-5 md:size-[22px]" />
        </span>
        <Badge tone={soon ? "muted" : "success"} className="hidden md:inline-flex">
          {soon ? "قريباً" : "متاح"}
        </Badge>
      </div>
      <p className="flex-1 text-[15px] font-semibold md:flex-none md:text-[17px] md:font-bold">{path.title}</p>
      <p className="hidden text-sm leading-[1.7] text-muted-foreground md:block">{path.summary}</p>
      {soon && <p className="hidden text-[13px] text-muted-foreground md:mt-auto md:block">أبلغني عند الإطلاق</p>}
      <Badge tone={soon ? "muted" : "success"} className="md:hidden">
        {soon ? "قريباً" : "متاح"}
      </Badge>
    </Link>
  );
}
