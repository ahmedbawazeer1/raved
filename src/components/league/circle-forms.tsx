"use client";

import { useActionState, useState } from "react";
import { Copy } from "lucide-react";
import { CIRCLE_NAMES } from "@shared/gamification/league";
import { createCircle, joinCircle, type CircleState } from "@/app/(student)/student/circle/actions";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { fx } from "@/lib/fx";
import { cn } from "@/lib/utils";

export function CreateCircle() {
  const [state, action] = useActionState<CircleState, FormData>(createCircle, {});
  const [name, setName] = useState<string>(CIRCLE_NAMES[0]);
  return (
    <form action={action} className="flex flex-col gap-3">
      <b>حلقة جديدة</b>
      <fieldset className="flex flex-wrap gap-2">
        <legend className="mb-2 text-sm text-muted-foreground">اختر اسماً</legend>
        {CIRCLE_NAMES.map((n) => (
          <label
            key={n}
            className={cn(
              "flex min-h-11 cursor-pointer items-center rounded-2xl rounded-es-md border-2 px-3 text-sm font-bold has-focus-visible:outline-2 has-focus-visible:outline-primary",
              name === n ? "border-primary bg-primary-tint" : "border-border bg-card",
            )}
          >
            <input type="radio" name="name" value={n} checked={name === n} onChange={() => setName(n)} className="sr-only" />
            {n}
          </label>
        ))}
      </fieldset>
      {state.error && (
        <p role="alert" className="text-sm text-error">
          {state.error}
        </p>
      )}
      <SubmitButton pendingLabel="جارٍ الإنشاء…">أنشئ الحلقة</SubmitButton>
    </form>
  );
}

export function JoinCircle() {
  const [state, action] = useActionState<CircleState, FormData>(joinCircle, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <label htmlFor="circle-code" className="font-bold">
        عندك رمز من صديق؟
      </label>
      <div className="flex gap-2">
        <input
          id="circle-code"
          name="code"
          dir="ltr"
          maxLength={6}
          autoComplete="off"
          autoCapitalize="characters"
          placeholder="ABC123"
          className="min-h-12 flex-1 rounded-2xl border-2 border-border bg-card px-4 font-en text-lg tracking-[.3em] uppercase focus:border-primary focus:outline-none"
        />
        <SubmitButton pendingLabel="…">انضم</SubmitButton>
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-error">
          {state.error}
        </p>
      )}
    </form>
  );
}

export function CopyCode({ code }: { code: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      type="button"
      variant="secondary"
      onClick={() => {
        void navigator.clipboard?.writeText(code).then(() => {
          setDone(true);
          fx("pop");
        });
      }}
    >
      <Copy className="size-4" aria-hidden="true" />
      {done ? "نُسخ!" : "انسخ الرمز"}
    </Button>
  );
}
