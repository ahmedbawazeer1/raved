import type { Metadata } from "next";
import { parseAvatar } from "@shared/art/avatar";
import { circleSchema } from "@shared/gamification/league";
import { AvatarHead } from "@/components/art/avatar";
import { CopyCode, CreateCircle, JoinCircle } from "@/components/league/circle-forms";
import { Card } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { TopBar } from "@/components/student/top-bar";
import { requireActiveStudent } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { leaveCircle } from "./actions";

export const metadata: Metadata = { title: "حلقة الأصدقاء" };

/** The lake fills with the members' drops this week. */
function Lake({ total, goal }: { total: number; goal: number }) {
  const p = Math.min(1, goal ? total / goal : 0);
  const y = 110 - p * 80;
  return (
    <svg viewBox="0 0 320 130" className="w-full" role="img" aria-label={`البحيرة: ${total} من ${goal} قطرة`}>
      <defs>
        <clipPath id="lake-clip">
          <ellipse cx="160" cy="80" rx="140" ry="44" />
        </clipPath>
        <linearGradient id="lake-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8FD3F7" />
          <stop offset="1" stopColor="#1C6FA3" />
        </linearGradient>
      </defs>
      <ellipse cx="160" cy="84" rx="150" ry="48" fill="#86D8B2" />
      <ellipse cx="160" cy="80" rx="140" ry="44" fill="#E6CD9C" />
      <g clipPath="url(#lake-clip)">
        <rect x="0" y={y} width="320" height="140" fill="url(#lake-water)" style={{ transition: "y 1s ease-out" }} />
        <path d={`M0 ${y} q20 -6 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0`} stroke="#fff" strokeWidth="3" fill="none" opacity=".5" />
      </g>
      <ellipse cx="110" cy="62" rx="26" ry="6" fill="#fff" opacity=".25" />
    </svg>
  );
}

export default async function CirclePage() {
  await requireActiveStudent();
  const supabase = await createClient();
  const { data } = await supabase.rpc("my_circle");
  const parsed = circleSchema.safeParse(data);
  const circle = parsed.success ? parsed.data : null;

  return (
    <>
      <TopBar backHref="/student/league" title="حلقة الأصدقاء" subtitle={<>هدف أسبوعي مشترك يمتلئ كبحيرة</>} />
      <main className="mx-auto flex w-full max-w-[640px] flex-col gap-4 px-4 py-5">
        {circle ? (
          <>
            <Card className="flex flex-col gap-3 p-5">
              <div className="flex items-center justify-between">
                <b className="text-lg">{circle.name}</b>
                <span className="text-sm text-muted-foreground">{circle.members.length} أعضاء</span>
              </div>
              <b>هدف الأسبوع: نملأ البحيرة</b>
              <Lake total={circle.total} goal={circle.goal} />
              <p className="text-center text-sm">
                <b className="font-en">{circle.total}</b> من <b className="font-en">{circle.goal}</b> قطرة
                {circle.total >= circle.goal && " · امتلأت البحيرة! 🎉"}
              </p>
              <ul className="flex flex-wrap justify-center gap-3" aria-label="الأعضاء">
                {circle.members.map((m, i) => (
                  <li key={i} className="flex w-16 flex-col items-center gap-1 text-center text-xs">
                    <span className={cn("rounded-full p-0.5", m.active ? "bg-[#2E9BD6]" : "bg-border")}>
                      <AvatarHead config={parseAvatar(m.avatar)} size={44} />
                    </span>
                    <span className={cn(m.me && "font-bold")}>{m.name}</span>
                    {m.active && <span className="text-[10px] text-[#1C6FA3]">سقى هذا الأسبوع</span>}
                  </li>
                ))}
              </ul>
            </Card>
            <Card className="flex flex-col gap-3 p-5">
              <b>ادعُ أصدقاءك</b>
              <p className="text-sm text-muted-foreground">أعطِ صديقك هذا الرمز ليدخل الحلقة (حتى ١٠ أعضاء).</p>
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-primary-tint p-3">
                <b className="font-en text-2xl tracking-[.3em]" dir="ltr">
                  {circle.code}
                </b>
                <CopyCode code={circle.code} />
              </div>
            </Card>
            <form action={leaveCircle}>
              <SubmitButton variant="secondary" className="w-full" pendingLabel="…">
                اخرج من الحلقة
              </SubmitButton>
            </form>
          </>
        ) : (
          <>
            <Card className="p-5 text-sm leading-relaxed text-muted-foreground">
              ادرسوا معاً: كل قطرة يجمعها أي عضو تملأ بحيرة الحلقة. لا ترتيب داخل الحلقة، ولا يظهر عدد قطرات كل عضو.
            </Card>
            <Card className="p-5">
              <JoinCircle />
            </Card>
            <Card className="p-5">
              <CreateCircle />
            </Card>
          </>
        )}
      </main>
    </>
  );
}
