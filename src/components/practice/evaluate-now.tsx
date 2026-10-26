"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { evaluateWritingNow } from "@/app/(student)/student/practice/actions";

export function EvaluateNowButton({ submissionId }: { submissionId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  return (
    <div className="flex flex-col gap-2">
      <Button
        disabled={busy}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const res = await evaluateWritingNow(submissionId).catch(() => ({ error: "لا يوجد اتصال. حاول عند عودة الاتصال.", queued: true }));
            if (res.error) setError(res.error);
            router.refresh();
          })
        }
      >
        {busy ? "جارٍ التصحيح…" : "صحّح الآن"}
      </Button>
      {error && <Alert tone="warning">{error}</Alert>}
    </div>
  );
}
