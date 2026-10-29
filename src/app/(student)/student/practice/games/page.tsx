import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { TopBar } from "@/components/student/top-bar";
import { requireActiveStudent } from "@/lib/auth/session";
import { yemenDay } from "@/lib/ai/limits";
import { GAME_TITLES, type GameKind } from "@/lib/games/logic";
import { getGameWords } from "@/lib/games/queries";
import { getPrimaryPath } from "@/lib/student/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "ساحة الألعاب" };

const ORDER: GameKind[] = ["speed", "memory", "match", "swipe", "listen", "spell", "dictation", "pronounce", "flashcards"];

export default async function GamesPage() {
  const { userId } = await requireActiveStudent();
  const path = await getPrimaryPath(userId);
  const words = path ? await getGameWords(userId, path.id) : [];
  const supabase = await createClient();
  const { data: today } = await supabase.from("xp_events").select("ref").eq("student_id", userId).eq("kind", "game").like("ref", `%:${yemenDay()}`);
  const played = new Set((today ?? []).map((r) => r.ref.split(":")[0]));

  return (
    <>
      <TopBar backHref="/student/practice" title="ساحة الألعاب" subtitle={<>كل لعبة تنهيها اليوم = 5 نقاط</>} />
      <main className="mx-auto flex w-full max-w-[640px] flex-col gap-3 px-4 py-5">
        {words.length < 4 ? (
          <Card className="p-5 text-sm leading-relaxed text-muted-foreground">
            الألعاب تستعمل الكلمات التي تعلمتها. أكمل أول درس في رحلتك، ثم تعال والعب.
          </Card>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              تلعب بـ {words.length} كلمة تعلمتها · لعبت {played.size} من {ORDER.length} اليوم
            </p>
            <ul className="grid grid-cols-2 gap-2.5">
              {ORDER.map((kind) => (
                <li key={kind}>
                  <Link
                    href={`/student/practice/games/${kind}`}
                    className="flex min-h-28 flex-col items-center justify-center gap-1 rounded-2xl border border-border bg-card p-3 text-center text-foreground no-underline hover:border-primary hover:text-foreground"
                  >
                    <span className="text-3xl" aria-hidden="true">
                      {GAME_TITLES[kind].icon}
                    </span>
                    <span className="font-bold">{GAME_TITLES[kind].title}</span>
                    {played.has(kind) ? (
                      <span className="flex items-center gap-1 text-xs text-success">
                        <CheckCircle2 className="size-3.5" aria-hidden="true" />
                        لعبتها اليوم
                      </span>
                    ) : (
                      <span className="text-xs text-warning">+5 نقاط</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
    </>
  );
}
