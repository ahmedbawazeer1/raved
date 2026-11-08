"use client";

import { useActionState, useState } from "react";
import { Alert, Field, Input, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import type { AdminFormState } from "@/app/(admin)/admin/actions";
import { publishBuiltUnit, rebuildLesson, rejectBuiltUnit, saveSection } from "@/app/(studio)/studio/units/actions";

function Status({ state }: { state: AdminFormState }) {
  if (state.error) return <Alert tone="error">{state.error}</Alert>;
  if (state.message) return <Alert tone="success">{state.message}</Alert>;
  return null;
}

/** Edits one written section as plain text (format hint under the box). */
export function SectionForm({
  unitId,
  lessonKey,
  sectionKey,
  block,
  title,
  text,
  hint,
  disabled,
}: {
  unitId: string;
  lessonKey: string;
  sectionKey: string;
  block: string;
  title: string;
  text: string;
  hint: string;
  disabled: boolean;
}) {
  const [state, action] = useActionState<AdminFormState, FormData>(saveSection, {});
  const id = `${lessonKey}-${sectionKey}`;
  const english = ["audio", "reading", "speaking_task", "writing_task"].includes(block);
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="unit_id" value={unitId} />
      <input type="hidden" name="lesson_key" value={lessonKey} />
      <input type="hidden" name="section_key" value={sectionKey} />
      <input type="hidden" name="block" value={block} />
      <Status state={state} />
      <Field id={id} label={title} hint={hint}>
        <Textarea
          id={id}
          name="text"
          rows={Math.min(14, Math.max(3, text.split("\n").length + 1))}
          dir={english ? "ltr" : undefined}
          defaultValue={text}
          disabled={disabled}
        />
      </Field>
      {!disabled && (
        <SubmitButton size="sm" variant="secondary" className="self-start" pendingLabel="جارٍ الحفظ…">
          احفظ التعديل
        </SubmitButton>
      )}
    </form>
  );
}

/** Asks for ONE lesson to be rebuilt, with a note and/or another video. */
export function RebuildLessonForm({
  unitId,
  lessonKey,
  alternatives,
}: {
  unitId: string;
  lessonKey: string;
  alternatives: { youtube_id: string; title: string; channel: string }[];
}) {
  const [state, action] = useActionState<AdminFormState, FormData>(rebuildLesson, {});
  return (
    <form action={action} className="flex flex-col gap-3 rounded-xl bg-background p-4">
      <input type="hidden" name="unit_id" value={unitId} />
      <input type="hidden" name="lesson_key" value={lessonKey} />
      <Status state={state} />
      <Field id={`note-${lessonKey}`} label="أعد بناء هذا الدرس بملاحظة" hint="الملاحظة تُحفظ قاعدة دائمة للوكيل." optional>
        <Textarea id={`note-${lessonKey}`} name="note" rows={2} maxLength={1000} />
      </Field>
      <Field id={`video-${lessonKey}`} label="أو بفيديو آخر (رابط يوتيوب)" optional>
        <Input id={`video-${lessonKey}`} name="video" dir="ltr" placeholder="https://www.youtube.com/watch?v=…" list={`alt-${lessonKey}`} />
      </Field>
      {alternatives.length > 0 && (
        <div className="text-sm">
          <p className="mb-1 text-muted-foreground">بدائل وجدها الوكيل (انسخ الرابط إلى الخانة):</p>
          <ul className="flex flex-col gap-1">
            {alternatives.map((a) => (
              <li key={a.youtube_id} dir="ltr" className="break-all">
                <a href={`https://www.youtube.com/watch?v=${a.youtube_id}`} target="_blank" rel="noreferrer">
                  {a.title}
                </a>{" "}
                <span className="text-muted-foreground">— {a.channel}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <SubmitButton size="sm" variant="secondary" className="self-start" pendingLabel="جارٍ الإرسال…">
        أعد بناء الدرس
      </SubmitButton>
    </form>
  );
}

/** Publishing asks once more: the unit reaches every student of the level at once. */
export function PublishUnitForm({ unitId, disabled }: { unitId: string; disabled: boolean }) {
  const [state, action] = useActionState<AdminFormState, FormData>(publishBuiltUnit, {});
  const [sure, setSure] = useState(false);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="unit_id" value={unitId} />
      <Status state={state} />
      {!sure ? (
        <Button type="button" disabled={disabled} onClick={() => setSure(true)}>
          انشر الوحدة للطلاب
        </Button>
      ) : (
        <>
          <span className="text-sm font-semibold">تظهر لكل طلاب المستوى فوراً. متأكد؟</span>
          <SubmitButton pendingLabel="جارٍ النشر…">نعم، انشر</SubmitButton>
          <Button type="button" variant="secondary" onClick={() => setSure(false)}>
            إلغاء
          </Button>
        </>
      )}
    </form>
  );
}

export function RejectUnitForm({ unitId }: { unitId: string }) {
  const [state, action] = useActionState<AdminFormState, FormData>(rejectBuiltUnit, {});
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="unit_id" value={unitId} />
      <Status state={state} />
      <Field id="reject-note" label="ماذا يغيّر الوكيل في الوحدة كلها؟">
        <Textarea id="reject-note" name="note" rows={2} required minLength={5} maxLength={1000} />
      </Field>
      <SubmitButton size="sm" variant="destructive" className="self-start" pendingLabel="جارٍ الإرسال…">
        أعد بناء الوحدة كاملة
      </SubmitButton>
    </form>
  );
}
