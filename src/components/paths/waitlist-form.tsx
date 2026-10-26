"use client";

import { useActionState } from "react";
import { Alert, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { joinWaitlist, type WaitlistState } from "@/app/(public)/paths/actions";

export function WaitlistForm({ pathId, signedIn }: { pathId: string; signedIn: boolean }) {
  const [state, action] = useActionState<WaitlistState, FormData>(joinWaitlist, {});

  if (state.ok) {
    return (
      <Alert tone="success">
        <b>سجّلناك.</b> سنبلغك {signedIn ? "داخل المنصة وبالبريد" : "بالبريد"} عندما يُفتح المسار.
      </Alert>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-2.5">
      <input type="hidden" name="path_id" value={pathId} />
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {signedIn ? (
        <SubmitButton>أبلغني</SubmitButton>
      ) : (
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <label htmlFor="waitlist-email" className="sr-only">
            بريدك الإلكتروني
          </label>
          <Input id="waitlist-email" name="email" type="email" dir="ltr" className="text-end" placeholder="بريدك الإلكتروني" autoComplete="email" required />
          <SubmitButton className="sm:min-w-28">أبلغني</SubmitButton>
        </div>
      )}
    </form>
  );
}
