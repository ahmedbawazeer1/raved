import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GAME_INFO, isArenaGame } from "@shared/arena/games";
import { ArenaMatch } from "@/components/arena/arena-match";
import { TopBar } from "@/components/student/top-bar";
import { requireActiveStudent } from "@/lib/auth/session";

export async function generateMetadata({ params }: PageProps<"/student/arena/[game]">): Promise<Metadata> {
  const { game } = await params;
  return { title: isArenaGame(game) ? GAME_INFO[game].name : "الساحة" };
}

export default async function ArenaGamePage({ params }: PageProps<"/student/arena/[game]">) {
  const { game } = await params;
  if (!isArenaGame(game)) notFound();
  await requireActiveStudent();
  return (
    <>
      <TopBar backHref="/student/arena" title={GAME_INFO[game].name} subtitle={<>{GAME_INFO[game].tagline}</>} />
      <main className="mx-auto flex w-full max-w-[560px] flex-col gap-4 px-4 py-5">
        <ArenaMatch game={game} />
      </main>
    </>
  );
}
