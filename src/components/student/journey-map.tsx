import Link from "next/link";
import { Check, Lock, MapPin, Play } from "lucide-react";
import { En } from "@/components/en";
import type { UnitView } from "@/lib/student/progress";
import { cn } from "@/lib/utils";

// Zigzag positions of the stops along the road (logical: start = right in RTL).
const OFFSETS = ["ms-0", "ms-[22%]", "ms-[44%]", "ms-[22%]"];

/**
 * «رحلة حضرموت»: each unit is a stop on a road. Finished stops get a stamp; the current stop
 * glows; the stops after it are locked until the student passes the unit before.
 */
export function JourneyMap({ units, pathSlug }: { units: UnitView[]; pathSlug: string }) {
  const stamps = units.filter((u) => u.state === "done").length;
  const title = units.some((u) => u.stop) ? "رحلة حضرموت" : "رحلتك";
  return (
    <section aria-label={title} className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-lg font-bold">
          <MapPin className="size-5 text-primary" aria-hidden="true" />
          {title}
        </h2>
        <span className="rounded-full bg-warning-tint px-3 py-1 text-sm font-semibold text-warning">
          {stamps} {stamps === 1 ? "ختم" : "أختام"} من {units.length}
        </span>
      </div>
      <ol className="relative flex flex-col gap-1 py-2">
        {units.map((u, i) => {
          const stop = u.stop ?? `الوحدة ${u.position}`;
          const circle = (
            <span
              className={cn(
                "relative flex size-16 flex-none items-center justify-center rounded-full border-4 shadow-sm",
                u.state === "done" && "border-accent bg-accent text-[#5C3D00]",
                u.state === "now" && "border-primary-tint bg-primary text-white ring-4 ring-primary/25 motion-safe:animate-pulse",
                u.state === "open" && "border-primary-tint bg-card text-primary",
                u.state === "locked" && "border-border bg-muted text-[#9AA8A4]",
              )}
            >
              {u.state === "done" ? (
                <Check className="size-7" strokeWidth={3} aria-label="ختم: أكملت المحطة" />
              ) : u.state === "now" ? (
                <Play className="size-7 fill-current" aria-label="محطتك الآن" />
              ) : u.state === "locked" ? (
                <Lock className="size-6" aria-label="مقفلة" />
              ) : (
                <MapPin className="size-6" aria-label="مفتوحة للمراجعة" />
              )}
            </span>
          );
          const label = (
            <span className="flex flex-col">
              <span className={cn("font-bold", u.state === "locked" && "text-muted-foreground")}>{stop}</span>
              <span className="text-xs text-muted-foreground">
                الوحدة {u.position} · <En>{u.title}</En>
              </span>
              {u.state === "now" && (
                <span className="mt-0.5 text-xs font-semibold text-primary">
                  {u.lessonsDone} من {u.lessons.length} دروس · تابع رحلتك
                </span>
              )}
            </span>
          );
          return (
            <li key={u.id} className={cn("flex flex-col", OFFSETS[i % OFFSETS.length])}>
              {i > 0 && <span aria-hidden="true" className="ms-8 h-5 w-0 border-s-4 border-dotted border-border" />}
              {u.state === "locked" ? (
                <div className="flex min-h-16 items-center gap-3">
                  {circle}
                  {label}
                </div>
              ) : (
                <Link href={`/student/${pathSlug}/unit/${u.id}`} className="flex min-h-16 items-center gap-3 text-foreground no-underline hover:text-foreground">
                  {circle}
                  {label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
