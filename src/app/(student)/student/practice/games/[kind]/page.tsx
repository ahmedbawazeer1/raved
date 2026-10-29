import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { TopBar } from "@/components/student/top-bar";
import { PracticeGame } from "@/components/games/practice-game";
import { requireActiveStudent } from "@/lib/auth/session";
import { GAME_TITLES, type GameKind } from "@/lib/games/logic";
import { getGameWords } from "@/lib/games/queries";
import { getPrimaryPath } from "@/lib/student/queries";

export const metadata: Metadata = { title: "لعبة" };

export default async function GamePage({ params }: PageProps<"/student/practice/games/[kind]">) {
  const { kind } = await params;
  if (!(kind in GAME_TITLES)) notFound();
  const { userId } = await requireActiveStudent();
  const path = await getPrimaryPath(userId);
  const words = path ? await getGameWords(userId, path.id) : [];
  if (words.length < 4) redirect("/student/practice/games");

  return (
    <>
      <TopBar backHref="/student/practice/games" title={GAME_TITLES[kind as GameKind].title} />
      <main className="mx-auto flex w-full max-w-[640px] flex-col gap-3 px-4 py-5">
        <PracticeGame kind={kind as GameKind} words={words} />
      </main>
    </>
  );
}
