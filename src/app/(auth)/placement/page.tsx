import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Clock, Headphones, HelpCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PlacementRunner } from "@/components/placement/placement-runner";
import { requireActiveStudent } from "@/lib/auth/session";
import { parseFeatures } from "@/lib/paths/features";
import { canRetake, EXPECTED_MINUTES } from "@/lib/placement/engine";
import { loadBank, parseState } from "@/lib/placement/server";
import { getPrimaryPath } from "@/lib/student/queries";
import { createClient } from "@/lib/supabase/server";
import { startPlacement } from "./actions";

export const metadata: Metadata = { title: "اختبار تحديد المستوى" };

export default async function PlacementPage() {
  const { userId } = await requireActiveStudent();
  const path = await getPrimaryPath(userId);
  if (!path || !parseFeatures(path.features).placement) redirect("/student");

  const supabase = await createClient();
  const { data: attempts } = await supabase
    .from("placement_attempts")
    .select("id, status, state, started_at, completed_at")
    .eq("student_id", userId)
    .eq("path_id", path.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const open = attempts?.find((a) => a.status === "in_progress");
  if (open) {
    const state = parseState(open.state);
    const bank = await loadBank(path.id);
    const question = state?.currentQuestionId ? bank.views.get(state.currentQuestionId) : undefined;
    if (state && question) {
      return <PlacementRunner attemptId={open.id} initialQuestion={question} initialAnswered={state.answers.length} startedAt={open.started_at} />;
    }
  }

  const last = attempts?.find((a) => a.status === "completed");
  if (last && !canRetake(last.completed_at ? new Date(last.completed_at) : null, new Date())) redirect("/placement/result");

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[520px] flex-col gap-4 px-4 py-8">
      <h1 className="text-2xl font-bold">{last ? "أعد اختبار المستوى" : "لنعرف من أين تبدأ"}</h1>
      <p className="text-[15px] leading-relaxed text-muted-foreground">
        {last
          ? "مرّت 3 أشهر على اختبارك السابق. أعد الاختبار لترى تقدمك."
          : "اختبار قصير يحدد مستواك في الإنجليزية، ليبدأ معك المسار من الوحدة المناسبة لك. ليس امتحاناً، ولا يوجد نجاح أو رسوب."}
      </p>
      <Card className="flex flex-col gap-3.5 p-5 text-[15px]">
        <p className="flex items-center gap-3">
          <Clock className="size-5 flex-none text-primary" aria-hidden="true" />
          حوالي {EXPECTED_MINUTES} دقيقة: مفردات، وقواعد، وقراءة، واستماع.
        </p>
        <p className="flex items-center gap-3">
          <Headphones className="size-5 flex-none text-primary" aria-hidden="true" />
          الاستماع بصوت جهازك، بلا تحميل ولا فيديو.
        </p>
        <p className="flex items-center gap-3">
          <HelpCircle className="size-5 flex-none text-primary" aria-hidden="true" />
          إذا لم تعرف الإجابة اضغط «لا أعرف»، فهذا أفضل من التخمين.
        </p>
        <p className="flex items-center gap-3">
          <RotateCcw className="size-5 flex-none text-primary" aria-hidden="true" />
          إذا انقطع الاتصال، تكمل من نفس السؤال.
        </p>
      </Card>
      <form action={startPlacement} className="mt-auto flex flex-col gap-2">
        <Button type="submit" size="lg">
          ابدأ الاختبار
        </Button>
        <Button asChild variant="secondary">
          <Link href="/student">لاحقاً</Link>
        </Button>
      </form>
    </main>
  );
}
