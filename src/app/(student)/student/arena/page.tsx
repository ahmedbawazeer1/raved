import type { Metadata } from "next";
import Link from "next/link";
import { Droplet, Swords, Users } from "lucide-react";
import { ARENA_GAMES, GAME_INFO } from "@shared/arena/games";
import { TopBar } from "@/components/student/top-bar";
import { GameIcon } from "@/components/arena/game-icon";
import { requireActiveStudent } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "ساحة رفد" };

export default async function ArenaPage() {
  await requireActiveStudent();
  const supabase = await createClient();
  const { data } = await supabase.rpc("arena_today");
  const today = (data ?? {}) as Record<string, number>;
  const drops = ARENA_GAMES.reduce((n, g) => n + (today[g] ?? 0), 0);

  return (
    <>
      <TopBar backHref="/student/practice" title="ساحة رفد" subtitle={<>الأسئلة من الوحدات التي درستها فقط</>} />
      <main className="mx-auto flex w-full max-w-[640px] flex-col gap-4 px-4 py-5">
        <section
          className="flex items-center gap-3 rounded-3xl rounded-es-md p-4 text-white shadow-sm"
          style={{ background: "linear-gradient(135deg,#1C6FA3,#0E6E5C)" }}
        >
          <Droplet className="size-9 flex-none fill-white/30" aria-hidden="true" />
          <div className="flex-1">
            <p className="font-bold">قطرات الألعاب اليوم</p>
            <p className="text-sm opacity-85">٥ قطرات لكل لعبة تنجح فيها بنصف الإجابات على الأقل</p>
          </div>
          <b className="font-en text-2xl" dir="ltr">
            {drops}/{ARENA_GAMES.length * 5}
          </b>
        </section>

        <ul className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
          {ARENA_GAMES.map((g) => (
            <li key={g}>
              <Link
                href={`/student/arena/${g}`}
                className="group flex min-h-24 items-center gap-3 rounded-3xl rounded-es-md border-2 border-border bg-card p-3 text-foreground no-underline shadow-[0_4px_0_var(--color-border)] transition-transform hover:border-primary hover:text-foreground active:translate-y-1 active:shadow-none"
              >
                <GameIcon game={g} size={60} />
                <span className="flex flex-1 flex-col gap-0.5">
                  <b>{GAME_INFO[g].name}</b>
                  <span className="text-xs text-muted-foreground">{GAME_INFO[g].tagline}</span>
                  {today[g] ? (
                    <span className="text-xs font-semibold text-success">✓ أخذت قطراتها اليوم</span>
                  ) : (
                    <span className="text-xs text-warning">+٥ قطرات</span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <section className="grid grid-cols-2 gap-3">
          <Link
            href="/student/duel"
            className="flex min-h-16 items-center justify-center gap-2 rounded-2xl border-2 border-border bg-card font-bold text-foreground no-underline hover:border-primary hover:text-foreground"
          >
            <Swords className="size-5 text-primary" aria-hidden="true" />
            تحدَّ صديقاً
          </Link>
          <Link
            href="/student/circle"
            className="flex min-h-16 items-center justify-center gap-2 rounded-2xl border-2 border-border bg-card font-bold text-foreground no-underline hover:border-primary hover:text-foreground"
          >
            <Users className="size-5 text-primary" aria-hidden="true" />
            حلقتي
          </Link>
        </section>
      </main>
    </>
  );
}
