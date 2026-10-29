import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { TopBar } from "@/components/student/top-bar";
import { CreateDuelForm, JoinDuelForm } from "@/components/games/duel-forms";
import { requireActiveStudent } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "تحدي صديق" };

export default async function DuelsPage() {
  await requireActiveStudent();
  const supabase = await createClient();
  const { data } = await supabase.rpc("my_duels");
  const duels = (data as unknown as { code: string; created_at: string; mine: boolean; players: number }[] | null) ?? [];

  return (
    <>
      <TopBar backHref="/student/practice" title="تحدي صديق" subtitle={<>10 كلمات · من الأسرع والأدق؟</>} />
      <main className="mx-auto flex w-full max-w-[640px] flex-col gap-4 px-4 py-5">
        <Card className="flex flex-col gap-3 p-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            أنشئ تحدياً من الكلمات التي تعلمتها، ثم أرسل الرمز لصديقك. كل واحد يلعب في وقته، والفائز صاحب الإجابات الصحيحة الأكثر، ثم الأسرع.
          </p>
          <CreateDuelForm />
        </Card>
        <Card className="p-4">
          <JoinDuelForm />
        </Card>
        {duels.length > 0 && (
          <Card className="px-4 py-1.5">
            <h2 className="py-2 font-bold">تحدياتك</h2>
            {duels.map((d) => (
              <Link
                key={d.code}
                href={`/student/duel/${d.code}`}
                className="flex min-h-12 items-center justify-between border-t border-muted py-2 text-foreground no-underline hover:text-foreground"
              >
                <span className="font-en font-semibold">{d.code}</span>
                <span className="text-sm text-muted-foreground">
                  {d.mine ? "أنشأته" : "انضممت"} · {d.players} لاعب
                </span>
              </Link>
            ))}
          </Card>
        )}
      </main>
    </>
  );
}
