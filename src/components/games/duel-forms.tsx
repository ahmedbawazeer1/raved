"use client";

import { useActionState } from "react";
import { Swords } from "lucide-react";
import { Alert, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { createDuel, joinDuel, type DuelState } from "@/app/(student)/student/duel/actions";

export function CreateDuelForm() {
  const [state, action] = useActionState<DuelState>(createDuel, {});
  return (
    <form action={action} className="flex flex-col gap-2">
      <SubmitButton className="min-h-13" pendingLabel="جارٍ التجهيز…">
        <Swords className="size-5" aria-hidden="true" />
        أنشئ تحدياً جديداً
      </SubmitButton>
      {state.error && <Alert tone="error">{state.error}</Alert>}
    </form>
  );
}

export function JoinDuelForm() {
  const [state, action] = useActionState<DuelState, FormData>(joinDuel, {});
  return (
    <form action={action} className="flex flex-col gap-2">
      <label htmlFor="code" className="text-sm font-semibold">
        عندك رمز من صديقك؟
      </label>
      <div className="flex gap-2">
        <Input id="code" name="code" dir="ltr" maxLength={6} autoCapitalize="characters" autoComplete="off" placeholder="ABC123" className="font-en uppercase" />
        <SubmitButton variant="secondary" pendingLabel="…">
          ادخل
        </SubmitButton>
      </div>
      {state.error && <Alert tone="error">{state.error}</Alert>}
    </form>
  );
}
