"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import type { Watering } from "@shared/student/watering";
import { Rafed } from "@/components/art/rafed";
import { Button } from "@/components/ui/button";
import { confetti } from "@/lib/confetti";
import { calmMotion, fx } from "@/lib/fx";
import { cn } from "@/lib/utils";

interface BadgeView {
  id: string;
  title: string;
  description: string;
  icon: string;
}
const SEEN = "raved:badges-seen";
const DAYS = ["س", "ح", "ن", "ث", "ر", "خ", "ج"];
const Drop = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 20 26" className={className} aria-hidden="true">
    <path d="M10 1C10 1 2 12 2 17a8 8 0 0 0 16 0C18 12 10 1 10 1Z" fill="#2E9BD6" />
    <ellipse cx="7" cy="16" rx="2" ry="3.5" fill="#fff" opacity=".6" />
  </svg>
);

/** A number that counts up. */
function Count({ from, to }: { from: number; to: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (calmMotion()) {
      el.textContent = String(to);
      return;
    }
    const o = { v: from };
    const t = gsap.to(o, { v: to, duration: 1, delay: 0.4, ease: "power2.out", onUpdate: () => void (el.textContent = String(Math.round(o.v))) });
    return () => void t.kill();
  }, [from, to]);
  return <span ref={ref}>{from}</span>;
}

/**
 * The end of a lesson. On an ordinary day one summary screen (drops, watering, league); on a special
 * day each new badge follows, one at a time. Every screen continues with one tap.
 */
export function LessonReward({
  next,
  total,
  earned,
  watering,
  league,
  badges,
}: {
  next: string;
  total: number;
  earned: number;
  watering: Watering;
  league: { rank: number; xp: number } | null;
  badges: BadgeView[];
}) {
  const router = useRouter();
  const [fresh, setFresh] = useState<BadgeView[]>([]);
  const [screen, setScreen] = useState(0);
  useEffect(() => {
    // Badges not yet celebrated on this device (the first time, mark them all as seen quietly).
    let seen: string[] | null = null;
    try {
      seen = JSON.parse(localStorage.getItem(SEEN) ?? "null") as string[] | null;
      localStorage.setItem(SEEN, JSON.stringify(badges.map((b) => b.id)));
    } catch {
      seen = null;
    }
    if (seen) setFresh(badges.filter((b) => !seen.includes(b.id))); // eslint-disable-line react-hooks/set-state-in-effect
    fx("level");
    if (!calmMotion()) confetti();
  }, [badges]);

  const go = () => {
    if (screen < fresh.length) {
      setScreen(screen + 1);
      fx("level");
      if (!calmMotion()) confetti();
    } else router.push(next);
  };
  const badge = screen > 0 ? fresh[screen - 1] : null;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[520px] flex-col gap-4 px-4 pt-8 pb-6">
      {badge ? (
        <section
          key={badge.id}
          aria-label="وسام جديد"
          className="flex flex-1 flex-col items-center justify-center gap-3 text-center motion-safe:animate-[pop-in_.5s]"
        >
          <span className="flex size-36 items-center justify-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#FFE8A8,#F5A524_60%,#C77F06)] text-6xl shadow-[0_10px_30px_-10px_#C77F06]">
            {badge.icon}
          </span>
          <h1 className="text-3xl font-extrabold text-[#C77F06]">وسام جديد!</h1>
          <p className="text-lg font-bold">{badge.title}</p>
          <p className="text-muted-foreground">{badge.description}</p>
          <Rafed mood="proud" move="proud" moveKey={badge.id} size={90} />
        </section>
      ) : (
        <section aria-label="ملخص الدرس" className="flex flex-1 flex-col gap-4">
          <div className="flex items-center gap-3">
            <Rafed mood="happy" move="cheer" moveKey="done" size={100} />
            <div>
              <h1 className="text-3xl font-extrabold">أحسنت!</h1>
              <p className="text-muted-foreground">أكملت الدرس وسقيت رافد.</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-3xl rounded-es-lg border-2 border-[#9FD3EE] bg-card p-4">
            <Drop className="h-9 w-7" />
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">قطراتك</p>
              <p className="font-en text-3xl font-extrabold text-[#1C6FA3] tabular-nums">
                <Count from={Math.max(0, total - earned)} to={total} />
              </p>
            </div>
            {earned > 0 && (
              <span className="rounded-full bg-[#E0F1FA] px-3 py-1 font-en text-lg font-extrabold text-[#1C6FA3] dark:bg-[#10293A]">+{earned}</span>
            )}
          </div>
          <div className="flex flex-col gap-2 rounded-3xl rounded-es-lg border-2 border-border bg-card p-4">
            <p className="flex justify-between font-bold">
              السقاية
              <span className="font-en text-[#1C6FA3]">{watering.days}</span>
            </p>
            <ol className="flex justify-between" aria-label="أسبوع السقاية">
              {DAYS.map((d, i) => (
                <li key={d} className="flex flex-col items-center gap-0.5 text-xs font-bold text-[#1C6FA3]">
                  <span
                    className={cn(
                      "flex size-9 items-center justify-center rounded-full border-2 border-[#9FD3EE] bg-card",
                      i === watering.todayIndex && "ring-2 ring-[#2E9BD6] motion-safe:animate-[pop-in_.5s_.6s_both]",
                    )}
                  >
                    {watering.week[i] ? <Drop className="h-5 w-4" /> : i === 6 ? "🌙" : null}
                  </span>
                  {d}
                </li>
              ))}
            </ol>
          </div>
          {league && (
            <div className="flex items-center gap-3 rounded-3xl rounded-es-lg border-2 border-border bg-card p-4">
              <span className="text-2xl" aria-hidden="true">
                🏆
              </span>
              <p className="flex-1 font-bold">ترتيبك في الدوري هذا الأسبوع</p>
              <span className="font-en text-2xl font-extrabold">#{league.rank}</span>
            </div>
          )}
        </section>
      )}
      <Button size="lg" className="min-h-13" onClick={go}>
        {screen < fresh.length ? "التالي" : "متابعة"}
      </Button>
    </main>
  );
}
