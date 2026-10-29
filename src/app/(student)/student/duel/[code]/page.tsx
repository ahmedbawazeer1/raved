import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Share2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { TopBar } from "@/components/student/top-bar";
import { CopyButton } from "@/components/student/copy-button";
import { DuelRunner } from "@/components/games/duel-runner";
import { requireActiveStudent } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "التحدي" };

interface Duel {
  code: string;
  creator: string;
  mine: boolean;
  played: boolean;
  questions: { word: string; options: string[] }[];
  players: { name: string; score: number; time_ms: number; me: boolean }[];
}

export default async function DuelPage({ params }: PageProps<"/student/duel/[code]">) {
  const { code } = await params;
  await requireActiveStudent();
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_duel", { p_code: code });
  const duel = data as unknown as Duel | null;
  if (!duel) notFound();
  const invite = `تحداك ${duel.creator} في رفد! افتح «التدريب ← تحدي صديق» وأدخل الرمز: ${duel.code}`;

  return (
    <>
      <TopBar backHref="/student/duel" title={`التحدي ${duel.code}`} subtitle={<>من {duel.mine ? "إنشائك" : duel.creator}</>} />
      <main className="mx-auto flex w-full max-w-[640px] flex-col gap-4 px-4 py-5">
        {!duel.played ? (
          <DuelRunner code={duel.code} questions={duel.questions} />
        ) : (
          <Card className="px-4 py-1.5">
            <h2 className="py-2 font-bold">النتائج</h2>
            {duel.players.map((p, i) => (
              <div key={`${p.name}-${i}`} className={cn("flex min-h-12 items-center gap-3 border-t border-muted py-2", p.me && "font-bold text-primary")}>
                <span className="w-7 text-center">{["🥇", "🥈", "🥉"][i] ?? i + 1}</span>
                <span className="flex-1">{p.name}</span>
                <span className="font-en">
                  {p.score}/10 · {Math.round(p.time_ms / 1000)}s
                </span>
              </div>
            ))}
            {duel.players.length < 2 && <p className="py-3 text-sm text-muted-foreground">بانتظار صديقك… أرسل له الرمز.</p>}
          </Card>
        )}
        <Card className="flex flex-col gap-2 p-4">
          <p className="flex items-center gap-1.5 font-semibold">
            <Share2 className="size-4" aria-hidden="true" />
            ادعُ صديقاً
          </p>
          <p className="text-sm text-muted-foreground">
            الرمز: <span className="font-en text-lg font-bold text-foreground">{duel.code}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            <CopyButton text={invite} label="انسخ الدعوة" />
            <a
              href={`https://wa.me/?text=${encodeURIComponent(invite)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-10 items-center rounded-xl bg-success px-4 text-sm font-semibold text-white no-underline hover:text-white"
            >
              أرسل بواتساب
            </a>
          </div>
        </Card>
      </main>
    </>
  );
}
