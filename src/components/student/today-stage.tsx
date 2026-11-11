"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ListChecks, Target, X } from "lucide-react";
import { gsap } from "gsap";
import type { RafedStage } from "@shared/art/rafed";
import { worldFor } from "@shared/art/river";
import { tierOf } from "@shared/gamification/league";
import type { Watering } from "@shared/student/watering";
import type { UnitView } from "@shared/student/progress";
import { Rafed } from "@/components/art/rafed";
import { En } from "@/components/en";
import { RiverMap } from "@/components/student/river-map";
import { calmMotion } from "@/lib/fx";
import { cn } from "@/lib/utils";

export interface StageLesson {
  kind: "lesson" | "quiz" | "empty" | "finished";
  href: string | null;
  position?: number;
  title?: string;
  done?: number;
  total?: number;
}

const Drop = ({ color = "#2E9BD6", size = 16 }: { color?: string; size?: number }) => (
  <svg viewBox="0 0 20 26" width={size} height={size * 1.3} aria-hidden="true" className="flex-none">
    <path d="M10 1C10 1 2 12 2 17a8 8 0 0 0 16 0C18 12 10 1 10 1Z" fill={color} />
    <ellipse cx="7" cy="16" rx="1.8" ry="3.4" fill="#fff" opacity=".6" />
  </svg>
);

/** What Rafed says and the button he offers, by watering state. */
function waterCard(state: Watering["state"], lesson: StageLesson): { text: string; cta: string | null } {
  const go = lesson.kind === "quiz" ? "واجه الحارس" : lesson.kind === "lesson" ? ((lesson.done ?? 0) === 0 ? "ابدأ" : "أكمل") : null;
  if (lesson.kind === "empty") return { text: "سأخبرك عندما يجهز أول درس", cta: null };
  if (lesson.kind === "finished") return { text: "أنهيت كل الوحدات! راجع كلماتك", cta: null };
  switch (state) {
    case "watered":
      return { text: "سقيت رافد اليوم · أحسنت!", cta: go };
    case "thirsty":
      return { text: "رافد عطشان… درس واحد يرويه", cta: go };
    case "rest":
      return { text: "الجمعة راحة · سقايتك محفوظة", cta: go };
    case "new":
      return { text: "أنا رافد، وكل درس يسقيني", cta: go };
    default:
      return { text: "رافد ينتظر سقاية اليوم", cta: go };
  }
}

/**
 * «اليوم» as designed in the flows library: the river map IS the screen. A slim HUD above it (drops,
 * watering days, league), a dark-green card with today's unit and Rafed's water card floating on
 * top, Rafed on the bank; everything else (quests, shortcuts, vocabulary…) opens from one button.
 */
export function TodayStage({
  units,
  pathSlug,
  levelCode,
  stage,
  watering,
  drops,
  tier,
  lesson,
  badge,
  placement,
  sheet,
}: {
  units: UnitView[];
  pathSlug: string;
  levelCode: string;
  stage: RafedStage;
  watering: Watering;
  drops: number;
  tier: number;
  lesson: StageLesson;
  badge: number;
  /** A new student takes the placement test first: Rafed asks for it instead of offering a lesson. */
  placement: null | { started: boolean };
  sheet: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const world = worldFor(levelCode);
  const wc = waterCard(watering.state, lesson);
  const mood = watering.state === "thirsty" ? "wilt" : watering.state === "rest" ? "sleep" : watering.state === "watered" ? "happy" : "idle";
  const chip =
    "flex min-h-11 items-center gap-1.5 rounded-xl border border-border bg-card px-2.5 font-en text-sm font-extrabold tabular-nums no-underline shadow-sm text-[#1C6FA3] hover:text-[#1C6FA3]";

  useEffect(() => {
    const el = root.current;
    if (!el || calmMotion()) return;
    const q = (s: string) => el.querySelectorAll(s);
    const t = gsap
      .timeline()
      .from(q(".ts-hud"), { y: -30, opacity: 0, duration: 0.4 })
      .from(q(".ts-green"), { y: -60, opacity: 0, duration: 0.5, ease: "back.out(1.5)" }, 0.25)
      .from(q(".ts-water"), { y: -80, opacity: 0, duration: 0.5, ease: "back.out(1.6)" }, 0.5)
      .from(q(".ts-more"), { scale: 0, duration: 0.4, ease: "back.out(2.5)" }, 0.8);
    return () => {
      t.kill();
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div ref={root} className="flex h-[calc(100dvh-var(--bn))] flex-col md:h-dvh">
      <h1 className="sr-only">اليوم</h1>
      <nav
        aria-label="إنجازاتك"
        className="ts-hud mx-auto flex w-full max-w-[520px] flex-none items-center justify-between gap-2 bg-background px-4 pt-[max(8px,env(safe-area-inset-top))] pb-2 md:pt-3"
      >
        <Link href="/student/progress#badges" className={chip} aria-label={`${drops} قطرة`}>
          <Drop />
          {drops}
        </Link>
        <Link href="/student/progress" className={chip} aria-label={`${watering.days} أيام سقاية`}>
          <Drop color="#6CCBF2" />
          {watering.days} <small className="font-sans font-semibold">أيام</small>
        </Link>
        <Link href="/student/league" className={cn(chip, "font-sans")} aria-label={`الدوري: ${tierOf(tier).name}`}>
          <Drop size={14} />
          {tierOf(tier).name}
        </Link>
      </nav>

      <div className="relative min-h-0 flex-1 md:mx-auto md:mb-4 md:w-full md:max-w-[520px] md:overflow-hidden md:rounded-3xl md:border-2 md:border-border">
        <RiverMap units={units} pathSlug={pathSlug} levelCode={levelCode} stage={stage} variant="stage" />

        {/* Today's unit */}
        <div className="ts-green pointer-events-none absolute inset-x-3 top-2 z-10 mx-auto flex max-w-[496px] items-center justify-between gap-3 rounded-2xl rounded-es-md bg-primary px-3 py-2 text-white shadow-md">
          {lesson.kind === "lesson" || lesson.kind === "quiz" ? (
            <span className="flex min-w-0 flex-col gap-0.5">
              <small className="text-[11px] opacity-85">
                {world.name} · الوحدة {lesson.position}
              </small>
              <b className="truncate">
                <En>{lesson.title}</En>
              </b>
              {Boolean(lesson.total) && (
                <span className="mt-0.5 flex items-center gap-2" aria-label={`${lesson.done} من ${lesson.total} دروس`}>
                  <span className="h-1.5 w-24 overflow-hidden rounded-full bg-white/30">
                    <span
                      className="block h-full rounded-full bg-accent"
                      style={{ width: `${Math.round(((lesson.done ?? 0) / (lesson.total ?? 1)) * 100)}%` }}
                    />
                  </span>
                  <small className="font-en text-[11px]">
                    {lesson.done}/{lesson.total}
                  </small>
                </span>
              )}
            </span>
          ) : lesson.kind === "empty" ? (
            <span className="flex flex-col">
              <small className="text-[11px] opacity-85">{world.name}</small>
              <b>الدروس قيد الإعداد</b>
              <small className="text-xs opacity-90">سننشر أول وحدة قريباً</small>
            </span>
          ) : (
            <b>أنهيت كل الوحدات المنشورة 🎉</b>
          )}
          <Drop color="#9FE3FF" size={18} />
        </div>

        {/* Rafed's water card (or, for a new student, the placement test) */}
        {placement ? (
          <div className="ts-water absolute inset-x-3 top-[84px] z-10 mx-auto flex max-w-[496px] items-center gap-2.5 rounded-[18px] rounded-es-[5px] border-2 border-accent bg-card px-3 py-2.5 shadow-md">
            <Target className="size-6 flex-none text-accent" aria-hidden="true" />
            <span className="flex flex-1 flex-col">
              <b className="text-sm">{placement.started ? "أكمل اختبار المستوى" : "حدّد مستواك أولاً"}</b>
              <small className="text-xs text-muted-foreground">{placement.started ? "تكمل من نفس السؤال" : "٢٠ دقيقة لتبدأ من الوحدة المناسبة"}</small>
            </span>
            <Link
              href="/placement"
              className="flex min-h-11 items-center rounded-[15px] rounded-es-[5px] bg-[linear-gradient(180deg,#FFC864,#F5A524_58%)] px-4 text-sm font-bold text-[#3A2400] no-underline shadow-[0_3px_0_#C77F06] hover:text-[#3A2400] active:translate-y-0.5 active:shadow-none"
            >
              {placement.started ? "أكمل" : "ابدأ"}
            </Link>
          </div>
        ) : (
          <div className="ts-water absolute inset-x-3 top-[84px] z-10 mx-auto flex max-w-[496px] items-center gap-2.5 rounded-[18px] rounded-es-[5px] border-2 border-[#9FD3EE] bg-card px-3 py-2.5 shadow-md">
            <Drop size={22} />
            <span className="flex-1 text-sm font-bold">{wc.text}</span>
            {wc.cta && lesson.href && (
              <Link
                href={lesson.href}
                aria-label={lesson.kind === "quiz" ? "واجه حارس السدّ" : (lesson.done ?? 0) === 0 ? "ابدأ درس اليوم" : "أكمل درس اليوم"}
                className="flex min-h-11 items-center rounded-[15px] rounded-es-[5px] bg-[linear-gradient(180deg,#6FBDE8,#2E9BD6_58%)] px-4 text-sm font-bold text-white no-underline shadow-[0_3px_0_#1C6FA3] hover:text-white active:translate-y-0.5 active:shadow-none"
              >
                {wc.cta}
              </Link>
            )}
          </div>
        )}

        {/* Rafed on the bank */}
        <div className="pointer-events-none absolute bottom-1 left-2 z-10">
          <Rafed size={104} stage={stage} mood={mood} move={watering.state === "waiting" ? "wave" : undefined} moveKey="today" />
        </div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-label={badge ? `مهام اليوم والمزيد، ${badge} متبقية` : "مهام اليوم والمزيد"}
          className="ts-more absolute right-3 bottom-3 z-10 flex size-14 items-center justify-center rounded-full border-2 border-border bg-card text-primary shadow-[0_4px_0_var(--color-border)] active:translate-y-1 active:shadow-none"
        >
          <ListChecks className="size-6" aria-hidden="true" />
          {badge > 0 && (
            <span className="absolute -top-1 -end-1 flex size-5 items-center justify-center rounded-full bg-accent font-en text-[11px] font-bold text-accent-foreground">
              {badge}
            </span>
          )}
        </button>
      </div>

      {open && (
        <div role="dialog" aria-modal="true" aria-label="مهام اليوم والمزيد" className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
          <button type="button" aria-label="إغلاق" className="absolute inset-0 bg-black/45" onClick={() => setOpen(false)} />
          <div className="relative flex max-h-[82dvh] w-full max-w-md flex-col rounded-t-3xl bg-background shadow-xl motion-safe:animate-[sheet-up_.3s_ease-out] md:rounded-3xl">
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <b className="text-lg">اليوم والمزيد</b>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="إغلاق"
                className="flex size-11 items-center justify-center rounded-full bg-muted text-foreground"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            <div className="flex flex-col gap-3 overflow-y-auto px-4 pb-[max(20px,env(safe-area-inset-bottom))]">{sheet}</div>
          </div>
        </div>
      )}
    </div>
  );
}
