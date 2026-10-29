import type { Metadata } from "next";
import Link from "next/link";
import { Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { TopBar } from "@/components/student/top-bar";
import { requireActiveStudent } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { setLeagueOptIn } from "./actions";

export const metadata: Metadata = { title: "الدوري الأسبوعي" };

interface LeagueRow {
  rank: number;
  xp: number;
  me: boolean;
  name: string;
}
interface League {
  rows: LeagueRow[];
  me: { rank: number; xp: number; joined: boolean } | null;
}

const MEDAL = ["🥇", "🥈", "🥉"];

export default async function LeaguePage({ searchParams }: PageProps<"/student/league">) {
  const sp = await searchParams;
  const scope = sp.scope === "governorate" ? "governorate" : "all";
  await requireActiveStudent();
  const supabase = await createClient();
  const { data } = await supabase.rpc("weekly_league", { p_scope: scope });
  const league = (data as unknown as League | null) ?? { rows: [], me: null };
  const joined = league.me?.joined ?? false;

  return (
    <>
      <TopBar backHref="/student" title="الدوري الأسبوعي" subtitle={<>نقاط هذا الأسبوع · يبدأ كل سبت</>} />
      <main className="mx-auto flex w-full max-w-[640px] flex-col gap-4 px-4 py-5">
        <Card className="flex items-center gap-3 bg-foreground p-4 text-white">
          <Trophy className="size-9 flex-none text-accent" aria-hidden="true" />
          <div className="flex-1">
            <p className="font-bold">ترتيبك: {league.me?.rank ?? "—"}</p>
            <p className="text-sm text-white/70">{league.me?.xp ?? 0} نقطة هذا الأسبوع</p>
          </div>
        </Card>

        <nav aria-label="نطاق الدوري" className="grid grid-cols-2 gap-2">
          {[
            { key: "all", label: "كل الطلاب" },
            { key: "governorate", label: "محافظتي" },
          ].map((t) => (
            <Link
              key={t.key}
              href={`/student/league?scope=${t.key}`}
              aria-current={scope === t.key ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center justify-center rounded-xl font-semibold no-underline",
                scope === t.key ? "bg-primary text-white hover:text-white" : "bg-card text-foreground",
              )}
            >
              {t.label}
            </Link>
          ))}
        </nav>

        <Card className="px-4 py-1.5">
          {league.rows.length <= 1 && <p className="py-3 text-sm text-muted-foreground">لا يوجد مشاركون آخرون بعد. ادعُ زملاءك!</p>}
          <ol>
            {league.rows.map((r) => (
              <li
                key={`${r.rank}-${r.name}`}
                className={cn("flex min-h-12 items-center gap-3 border-b border-muted py-2 last:border-b-0", r.me && "font-bold text-primary")}
              >
                <span className="w-8 text-center font-en">{MEDAL[r.rank - 1] ?? r.rank}</span>
                <span className="flex-1">{r.name}</span>
                <span className="font-en">{r.xp}</span>
              </li>
            ))}
          </ol>
        </Card>

        <Card className="flex flex-col gap-2 p-4">
          <p className="text-sm leading-relaxed">
            {joined
              ? "أنت مشارك: يظهر اسمك الأول والحرف الأول من اسم عائلتك فقط."
              : "اسمك مخفي الآن. شارك ليظهر اسمك الأول والحرف الأول من اسم عائلتك لبقية الطلاب. يمكنك الخروج متى شئت."}
          </p>
          <form action={setLeagueOptIn}>
            <input type="hidden" name="join" value={joined ? "0" : "1"} />
            <SubmitButton variant={joined ? "secondary" : "primary"} pendingLabel="جارٍ الحفظ…">
              {joined ? "اخرج من الدوري" : "شارك في الدوري"}
            </SubmitButton>
          </form>
        </Card>
      </main>
    </>
  );
}
