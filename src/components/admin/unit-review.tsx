"use client";

import { useActionState, useState } from "react";
import { Copy } from "lucide-react";
import { Alert, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { publishUnit, reviewLesson, type ReviewState } from "@/app/(admin)/admin/content/actions";

export function LessonReviewForm({ lessonId, note, status }: { lessonId: string; note: string | null; status: string }) {
  const [state, action] = useActionState<ReviewState, FormData>(reviewLesson, {});
  return (
    <form action={action} className="flex flex-col gap-2.5">
      <input type="hidden" name="lesson_id" value={lessonId} />
      <label htmlFor={`note-${lessonId}`} className="text-sm font-semibold">
        ملاحظتك على هذا الدرس
      </label>
      <Textarea id={`note-${lessonId}`} name="note" rows={3} defaultValue={note ?? ""} maxLength={2000} />
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.ok && <Alert tone="success">حُفظ.</Alert>}
      <div className="flex flex-wrap gap-2.5">
        <SubmitButton name="status" value="approved" pendingLabel="جارٍ الحفظ…">
          {status === "approved" ? "معتمد ✓ (احفظ الملاحظة)" : "اعتمد الدرس"}
        </SubmitButton>
        <SubmitButton name="status" value="changes" variant="secondary" pendingLabel="جارٍ الحفظ…">
          يحتاج تعديلاً
        </SubmitButton>
      </div>
    </form>
  );
}

export function PublishUnitForm({ unitId, ready }: { unitId: string; ready: boolean }) {
  const [state, action] = useActionState<ReviewState, FormData>(publishUnit, {});
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="unit_id" value={unitId} />
      <SubmitButton disabled={!ready} pendingLabel="جارٍ النشر…">
        انشر الوحدة
      </SubmitButton>
      {!ready && <p className="text-xs text-muted-foreground">اعتمد كل الدروس أولاً.</p>}
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.ok && <Alert tone="success">نُشرت الوحدة وأصبحت متاحة للطلاب.</Alert>}
    </form>
  );
}

/** Copies review notes in the format of docs/CONTENT_PROMPTS.md §3, ready to paste into Claude Code. */
export function CopyNotesButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="secondary"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2500);
        } catch {
          window.prompt("انسخ النص:", text);
        }
      }}
    >
      <Copy className="size-4" aria-hidden="true" />
      {copied ? "نُسخت الملاحظات" : "أعِد لـ Claude بملاحظات"}
    </Button>
  );
}
