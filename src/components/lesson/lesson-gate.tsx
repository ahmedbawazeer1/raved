"use client";

import { useActionState, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, Lock } from "lucide-react";
import { Alert } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { completeLesson, type CompleteLessonState } from "@/app/(student)/student/actions";
import { VIDEO_DONE, solvedStore } from "@/lib/gamification/events";

export interface GateTask {
  label: string;
  done: boolean;
  href?: string;
}

/**
 * The lesson's checklist and its «complete» button. Everything is mandatory: the button opens only
 * when the video is watched, every exercise is solved and the speaking/writing task is sent.
 * The server checks the same rules again (complete_lesson()).
 */
export function LessonGate({
  lessonId,
  nextHref,
  nextLabel,
  completed,
  exerciseIds,
  videoRequired,
  videoDone: initialVideoDone,
  tasks,
}: {
  lessonId: string;
  nextHref: string;
  nextLabel: string;
  completed: boolean;
  exerciseIds: string[];
  videoRequired: boolean;
  videoDone: boolean;
  tasks: GateTask[];
}) {
  const router = useRouter();
  const [state, action] = useActionState<CompleteLessonState, FormData>(completeLesson, {});
  const solved = solvedStore.parse(useSyncExternalStore(solvedStore.subscribe, solvedStore.getSnapshot, solvedStore.getServerSnapshot));
  const [videoDone, setVideoDone] = useState(initialVideoDone);

  useEffect(() => {
    const onVideo = () => {
      setVideoDone(true);
      router.refresh();
    };
    window.addEventListener(VIDEO_DONE, onVideo);
    return () => window.removeEventListener(VIDEO_DONE, onVideo);
  }, [router]);

  if (completed) {
    return (
      <Link
        href={nextHref}
        className="flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 font-semibold text-white no-underline hover:bg-primary-hover hover:text-white"
      >
        <CheckCircle2 className="size-5" aria-hidden="true" />
        مكتمل · {nextLabel}
      </Link>
    );
  }

  const solvedCount = exerciseIds.filter((id) => solved.has(id)).length;
  const items: GateTask[] = [
    ...(videoRequired ? [{ label: "شاهد فيديو الدرس (80% على الأقل)", done: videoDone }] : []),
    ...(exerciseIds.length ? [{ label: `حلّ كل التمارين (${solvedCount} من ${exerciseIds.length})`, done: solvedCount === exerciseIds.length }] : []),
    ...tasks,
  ];
  const ready = items.every((i) => i.done);

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="lesson_id" value={lessonId} />
      <input type="hidden" name="next" value={nextHref} />
      {items.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm" aria-label="مطلوب لإكمال الدرس">
          {items.map((i) => (
            <li key={i.label} className="flex items-center gap-2">
              {i.done ? (
                <CheckCircle2 className="size-4 flex-none text-success" aria-label="تم" />
              ) : (
                <Circle className="size-4 flex-none text-[#9AA8A4]" aria-label="لم يتم" />
              )}
              {i.href && !i.done ? (
                <Link href={i.href} className="font-semibold">
                  {i.label}
                </Link>
              ) : (
                <span className={i.done ? "text-muted-foreground" : "font-semibold"}>{i.label}</span>
              )}
            </li>
          ))}
        </ul>
      )}
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <SubmitButton className="min-h-13 w-full" pendingLabel="جارٍ الحفظ…" disabled={!ready}>
        {!ready && <Lock className="size-4" aria-hidden="true" />}
        {ready ? `أكملت الدرس · ${nextLabel}` : "أكمل المطلوب أولاً"}
      </SubmitButton>
    </form>
  );
}
