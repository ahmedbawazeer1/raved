import type { Metadata } from "next";
import Link from "next/link";
import { Gamepad2, Headphones, Mic, PenLine } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { En } from "@/components/en";
import { MixedText } from "@/components/mixed-text";
import { WritingSyncNotice } from "@/components/practice/writing-sync";
import { remainingToday } from "@/lib/ai/limits";
import { requireActiveStudent } from "@/lib/auth/session";
import { parseFeatures } from "@/lib/paths/features";
import { listPracticeTasks } from "@/lib/practice/server";
import { getCurriculum, getPrimaryPath } from "@/lib/student/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "التدريب" };

const avg = (scores: unknown) => {
  const values = Object.values((scores ?? {}) as Record<string, number>).filter((v) => typeof v === "number");
  return values.length ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10 : null;
};

export default async function PracticePage() {
  const { userId } = await requireActiveStudent();
  const path = await getPrimaryPath(userId);
  const features = parseFeatures(path?.features);
  const curriculum = path ? await getCurriculum(userId, path.id) : null;
  const reached = (curriculum?.units ?? []).filter((u) => u.state !== "locked").map((u) => u.id);
  const supabase = await createClient();
  const [tasks, today, { data: speaking }, { data: writing }] = await Promise.all([
    path ? listPracticeTasks(path.id, reached) : Promise.resolve([]),
    remainingToday(userId),
    supabase.from("speaking_attempts").select("id, lesson_id, scores, created_at, lessons(title)").eq("student_id", userId).order("created_at", { ascending: false }).limit(10),
    supabase.from("writing_submissions").select("id, lesson_id, status, scores, version, created_at, lessons(title)").eq("student_id", userId).order("created_at", { ascending: false }).limit(10),
  ]);
  const visible = tasks.filter((t) => (t.kind === "speaking" ? features.speaking : features.writing));
  const history = [
    ...(features.speaking ? (speaking ?? []).map((a) => ({ kind: "speaking" as const, ...a, status: "evaluated", version: 1 })) : []),
    ...(features.writing ? (writing ?? []).map((w) => ({ kind: "writing" as const, ...w })) : []),
  ].sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <main className="mx-auto flex w-full max-w-[640px] flex-col gap-3 px-4 py-5">
      <header>
        <h1 className="text-2xl font-bold">التدريب</h1>
        <p className="text-sm text-muted-foreground">
          {features.speaking && `محادثة ${today.used.speaking} من ${today.limits.speaking}`}
          {features.speaking && features.writing && " · "}
          {features.writing && `كتابة ${today.used.writing} من ${today.limits.writing}`} اليوم
        </p>
      </header>
      <WritingSyncNotice />

      <Link
        href="/student/practice/games"
        className="flex min-h-16 items-center gap-3 rounded-2xl bg-primary p-4 text-white no-underline hover:bg-primary-hover hover:text-white"
      >
        <Gamepad2 className="size-7 flex-none" aria-hidden="true" />
        <span className="flex-1">
          <span className="block font-bold">ساحة الألعاب</span>
          <span className="block text-sm text-primary-tint">سباق الدقيقة، الذاكرة، وصّل الأزواج… بالكلمات التي تعلمتها</span>
        </span>
      </Link>

      {visible.length === 0 && (
        <Card className="p-5 text-sm leading-relaxed text-muted-foreground">مهام المحادثة والكتابة تظهر هنا عندما تصل إلى دروسها.</Card>
      )}
      {visible.map((t) => (
        <Link
          key={`${t.kind}-${t.lessonId}`}
          href={`/student/practice/${t.kind}/${t.lessonId}`}
          className="flex min-h-16 items-center gap-3 rounded-2xl border border-border bg-card p-4 text-foreground no-underline hover:text-foreground"
        >
          <span className="flex size-10 flex-none items-center justify-center rounded-xl bg-ai-tint text-ai">
            {t.kind === "speaking" ? <Mic className="size-5" aria-hidden="true" /> : <PenLine className="size-5" aria-hidden="true" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs text-muted-foreground">
              {t.kind === "speaking" ? "محادثة" : "كتابة"} · <En>{t.unitTitle}</En>
            </span>
            <span className="block truncate font-semibold">
              <MixedText text={t.lessonTitle} />
            </span>
          </span>
          <Badge>متاح</Badge>
        </Link>
      ))}

      <Link
        href="/student/practice/listen"
        className="flex min-h-14 items-center gap-3 rounded-2xl border border-border bg-card p-4 text-foreground no-underline hover:text-foreground"
      >
        <Headphones className="size-6 flex-none text-primary" aria-hidden="true" />
        <span className="flex-1 font-semibold">استمع وكرّر · يعمل بلا إنترنت</span>
      </Link>

      {history.length > 0 && (
        <>
          <h2 className="mt-2 font-bold">السابقة</h2>
          {history.map((h) => {
            const score = avg(h.scores);
            return (
              <Link
                key={`${h.kind}-${h.id}`}
                href={`/student/practice/${h.kind}/result/${h.id}`}
                className="flex min-h-14 items-center gap-3 rounded-2xl border border-border bg-card p-3.5 text-foreground no-underline hover:text-foreground"
              >
                {h.kind === "speaking" ? <Mic className="size-5 text-muted-foreground" aria-hidden="true" /> : <PenLine className="size-5 text-muted-foreground" aria-hidden="true" />}
                <span className="min-w-0 flex-1">
                  <span className="block text-xs text-muted-foreground">
                    {h.kind === "speaking" ? "محادثة" : `كتابة · النسخة ${h.version}`} · {new Date(h.created_at).toLocaleDateString("ar")}
                  </span>
                  <span className="block truncate">
                    <MixedText text={h.lessons?.title ?? ""} />
                  </span>
                </span>
                {h.status !== "evaluated" ? (
                  <Badge tone="warning">بانتظار التصحيح</Badge>
                ) : score !== null ? (
                  <Badge tone="success">
                    <En>{score}/5</En>
                  </Badge>
                ) : null}
              </Link>
            );
          })}
        </>
      )}
    </main>
  );
}
