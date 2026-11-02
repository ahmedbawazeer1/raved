import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import type { Quest } from "@/lib/gamification/quests";

/** Today's three small quests, with a gift when all are done. */
export function DailyQuests({ quests }: { quests: Quest[] }) {
  const done = quests.filter((q) => q.done).length;
  const all = done === quests.length;
  return (
    <section aria-labelledby="quests-title" className="flex flex-col gap-2 rounded-3xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <svg viewBox="0 0 48 48" className={`size-11 flex-none ${all ? "motion-safe:animate-[boss-hit_.6s_ease-in-out_2]" : ""}`} aria-hidden="true">
          <rect x="7" y="20" width="34" height="23" rx="3" fill="#7048E8" />
          <rect x="5" y="14" width="38" height="9" rx="3" fill="#9775FA" />
          <rect x="21" y="14" width="6" height="29" fill="#FFD43B" />
          <path d="M24 14 Q14 4 12 10 Q12 15 24 14 Q36 15 36 10 Q34 4 24 14Z" fill="#FFD43B" stroke="#F59F00" strokeWidth="1.5" />
        </svg>
        <div className="min-w-0 flex-1">
          <h2 id="quests-title" className="font-bold">
            مهام اليوم
          </h2>
          <p className="text-xs text-muted-foreground">{all ? "أكملت مهام اليوم كلها 🎉 أحسنت!" : `${done} من ${quests.length} · تتجدد كل يوم`}</p>
        </div>
      </div>
      <div className="flex gap-1" aria-hidden="true">
        {quests.map((q) => (
          <span key={q.key} className={`h-2 flex-1 rounded-full ${q.done ? "bg-accent" : "bg-muted"}`} />
        ))}
      </div>
      <ul className="flex flex-col">
        {quests.map((q) => (
          <li key={q.key}>
            <Link href={q.href} className="flex min-h-11 items-center gap-2.5 text-sm text-foreground no-underline hover:text-foreground">
              {q.done ? (
                <CheckCircle2 className="size-5 flex-none text-success" aria-label="تم" />
              ) : (
                <Circle className="size-5 flex-none text-[#9AA8A4]" aria-label="لم يتم" />
              )}
              <span className={q.done ? "text-muted-foreground line-through" : "font-semibold"}>{q.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
