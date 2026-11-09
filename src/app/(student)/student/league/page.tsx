import type { Metadata } from "next";
import Link from "next/link";
import { Fragment } from "react";
import { ChevronLeft, Users } from "lucide-react";
import { parseAvatar } from "@shared/art/avatar";
import { CHAMPION_TITLES, LEAGUE_TIERS, championsSchema, parseLeague, tierOf, timeLeft, zoneOf, PROMOTE } from "@shared/gamification/league";
import { AvatarHead } from "@/components/art/avatar";
import { Card } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { LeagueResult } from "@/components/league/league-result";
import { TierBadge } from "@/components/league/tier-badge";
import { TopBar } from "@/components/student/top-bar";
import { requireActiveStudent } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { setLeagueOptIn } from "./actions";

export const metadata: Metadata = { title: "الدوري" };

export default async function LeaguePage() {
  await requireActiveStudent();
  const supabase = await createClient();
  const [{ data }, { data: champs }] = await Promise.all([supabase.rpc("weekly_league", { p_scope: "all" }), supabase.rpc("monthly_champions")]);
  const league = parseLeague(data);
  const joined = league.me?.joined ?? false;
  const tier = league.me?.tier ?? league.tier ?? 0;
  const t = tierOf(tier);
  const size = league.rows.length;
  const champions = championsSchema.safeParse(champs);
  const levels = champions.success ? Object.entries(champions.data.levels).sort(([a], [b]) => a.localeCompare(b)) : [];

  return (
    <>
      <TopBar backHref="/student" title="الدوري" subtitle={<>مجموعة من ٢٠ طالباً · النتائج يوم الجمعة</>} />
      {league.result && <LeagueResult result={league.result} />}
      <main className="mx-auto flex w-full max-w-[640px] flex-col gap-4 px-4 py-5">
        <section
          className="flex items-center gap-3 rounded-3xl rounded-es-md p-4 text-white shadow-sm"
          style={{ background: `linear-gradient(135deg, ${t.deep}, ${tierOf(Math.min(5, tier + 1)).deep})` }}
        >
          <TierBadge tier={tier} size={64} />
          <div className="flex-1">
            <b className="text-lg">دوري «{t.name}»</b>
            <p className="text-sm opacity-90">
              {league.settled
                ? "انتهى الأسبوع. مجموعة جديدة تبدأ السبت."
                : tier < 5
                  ? `أول ${PROMOTE} يصعدون إلى «${tierOf(tier + 1).name}» · باقي ${timeLeft(league.ends_at)}`
                  : `أعلى دوري! · باقي ${timeLeft(league.ends_at)}`}
            </p>
          </div>
          {league.me?.rank && (
            <div className="flex flex-col items-center">
              <small className="opacity-85">ترتيبك</small>
              <b className="font-en text-2xl">{league.me.rank}</b>
            </div>
          )}
        </section>

        <ol className="flex justify-between gap-1" aria-label="الدوريات">
          {LEAGUE_TIERS.map((x) => (
            <li key={x.id} className={cn("flex flex-col items-center gap-0.5 text-[11px]", x.id === tier ? "font-bold" : "text-muted-foreground")}>
              <TierBadge tier={x.id} size={x.id === tier ? 44 : 34} locked={x.id > tier} />
              {x.name}
            </li>
          ))}
        </ol>

        {joined ? (
          <Card className="px-3 py-1.5">
            {size <= 1 && <p className="py-3 text-sm text-muted-foreground">مجموعتك تمتلئ مع كل طالب يجمع قطرات هذا الأسبوع.</p>}
            <ol>
              {league.rows.map((r) => {
                const zone = zoneOf(r.rank, size, tier);
                const next = league.rows.find((x) => x.rank === r.rank + 1);
                return (
                  <Fragment key={`${r.rank}-${r.name}`}>
                    <li
                      className={cn(
                        "flex min-h-13 items-center gap-3 rounded-2xl px-2 py-1.5",
                        r.me && "bg-primary-tint font-bold text-primary-hover",
                        !r.me && zone === "up" && "bg-[#EAF7F1]",
                        !r.me && zone === "down" && "bg-[#FDF1EF]",
                      )}
                    >
                      <span className={cn("w-7 text-center font-en font-bold", zone === "up" ? "text-success" : zone === "down" ? "text-error" : "")}>
                        {r.rank}
                      </span>
                      <AvatarHead config={parseAvatar(r.avatar)} size={36} />
                      <span className="flex-1">{r.name}</span>
                      <span className="font-en">{r.xp}</span>
                      <span className="text-xs text-muted-foreground">قطرة</span>
                    </li>
                    {zone === "up" && next && zoneOf(next.rank, size, tier) !== "up" && (
                      <li aria-hidden="true" className="my-1 flex items-center gap-2 text-xs font-bold text-success">
                        <span className="h-px flex-1 bg-success/40" /> منطقة الصعود <span className="h-px flex-1 bg-success/40" />
                      </li>
                    )}
                    {zone !== "down" && next && zoneOf(next.rank, size, tier) === "down" && (
                      <li aria-hidden="true" className="my-1 flex items-center gap-2 text-xs font-bold text-error">
                        <span className="h-px flex-1 bg-error/40" /> منطقة النزول <span className="h-px flex-1 bg-error/40" />
                      </li>
                    )}
                  </Fragment>
                );
              })}
            </ol>
          </Card>
        ) : (
          <Card className="flex flex-col gap-3 p-5">
            <b>أنت خارج الدوري</b>
            <p className="text-sm leading-relaxed text-muted-foreground">
              لا يظهر اسمك ولا الأفتار لأحد. ارجع متى شئت: يظهر لزملائك اسمك الأول والحرف الأول من اسم عائلتك والأفتار فقط.
            </p>
            <form action={setLeagueOptIn}>
              <input type="hidden" name="join" value="1" />
              <SubmitButton pendingLabel="جارٍ الحفظ…">ارجع إلى الدوري</SubmitButton>
            </form>
          </Card>
        )}

        <Link
          href="/student/circle"
          className="flex min-h-14 items-center gap-3 rounded-2xl border-2 border-border bg-card px-4 text-foreground no-underline hover:border-primary hover:text-foreground"
        >
          <Users className="size-6 text-primary" aria-hidden="true" />
          <span className="flex flex-1 flex-col">
            <b>حلقة الأصدقاء</b>
            <span className="text-xs text-muted-foreground">هدف أسبوعي مشترك بلا ترتيب</span>
          </span>
          <ChevronLeft className="size-4 text-muted-foreground" aria-hidden="true" />
        </Link>

        <section aria-labelledby="champions" className="flex flex-col gap-2">
          <h2 id="champions" className="font-bold">
            أبطال الشهر الماضي
          </h2>
          {levels.length === 0 ? (
            <p className="text-sm text-muted-foreground">يُتوَّج الأبطال في أول يوم من كل شهر: أكثر قطرات، أطول سقاية، وبطل الساحة.</p>
          ) : (
            levels.map(([level, titles]) => (
              <Card key={level} className="flex flex-col gap-2 p-3">
                <b className="font-en text-sm" dir="ltr">
                  {level}
                </b>
                <ul className="grid grid-cols-3 gap-2">
                  {(["drops", "watering", "arena"] as const).map((k) => {
                    const who = titles[k];
                    return (
                      <li key={k} className="flex flex-col items-center gap-1 rounded-2xl bg-[#FFF8E8] p-2 text-center">
                        <span className="text-[11px] font-bold text-warning">{CHAMPION_TITLES[k].title}</span>
                        {who ? (
                          <>
                            <AvatarHead config={parseAvatar(who.avatar)} size={40} />
                            <span className="text-xs font-semibold">{who.name}</span>
                            <span className="text-[11px] text-muted-foreground">
                              {who.value} {CHAMPION_TITLES[k].unit}
                            </span>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </Card>
            ))
          )}
        </section>

        {joined && (
          <form action={setLeagueOptIn} className="flex flex-col gap-1 pt-2">
            <input type="hidden" name="join" value="0" />
            <SubmitButton variant="secondary" pendingLabel="جارٍ الحفظ…">
              اخرج من الدوري
            </SubmitButton>
            <small className="text-center text-muted-foreground">يظهر لزملائك اسمك الأول والحرف الأول من اسم عائلتك والأفتار فقط.</small>
          </form>
        )}
      </main>
    </>
  );
}
