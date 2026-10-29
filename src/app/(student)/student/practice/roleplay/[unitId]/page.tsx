import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TopBar } from "@/components/student/top-bar";
import { RoleplayChat } from "@/components/practice/roleplay-chat";
import { remainingToday } from "@/lib/ai/limits";
import { aiConfigured } from "@/lib/ai/provider";
import { requireActiveStudent } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "محادثة مع شخصية" };

export default async function RoleplayPage({ params }: PageProps<"/student/practice/roleplay/[unitId]">) {
  const { unitId } = await params;
  const { userId } = await requireActiveStudent();
  const supabase = await createClient();
  const { data: unit } = await supabase.from("units").select("id, title, roleplay").eq("id", unitId).maybeSingle();
  const role = unit?.roleplay as { character_ar?: string; opening_en?: string } | null;
  if (!unit || !role?.character_ar || !role.opening_en) notFound();
  const today = await remainingToday(userId);

  return (
    <div className="flex min-h-[calc(100dvh-68px)] flex-col">
      <TopBar backHref="/student/practice" title={role.character_ar} subtitle={<>محادثة الوحدة · {unit.title}</>} />
      {aiConfigured() ? (
        <RoleplayChat unitId={unit.id} character={role.character_ar} opening={role.opening_en} initialRemaining={today.remaining.assistant} />
      ) : (
        <p className="p-4 text-sm text-muted-foreground">المحادثة غير متاحة الآن.</p>
      )}
    </div>
  );
}
