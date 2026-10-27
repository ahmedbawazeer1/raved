"use client";

import Link from "next/link";
import { RefreshCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Shown instead of the browser's English error page when a page fails on the server. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-10">
      <div className="mx-auto flex max-w-[460px] flex-col items-center gap-3.5 text-center">
        <span className="flex size-20 items-center justify-center rounded-full bg-warning-tint text-warning">
          <TriangleAlert className="size-[38px]" aria-hidden="true" />
        </span>
        <h1 className="text-2xl font-bold">حدث خطأ مؤقت</h1>
        <p className="text-[15px] leading-[1.9] text-muted-foreground">
          لم نتمكن من فتح هذه الصفحة الآن. ما كتبته محفوظ. حاول مرة أخرى بعد قليل، وإذا تكرر الخطأ أخبر فريق رفد.
        </p>
        <Button className="w-full" onClick={reset}>
          <RefreshCw className="size-4" aria-hidden="true" />
          حاول مرة أخرى
        </Button>
        <Button asChild variant="secondary" className="w-full">
          <Link href="/">الصفحة الرئيسية</Link>
        </Button>
        {error.digest && <p className="font-en text-xs text-muted-foreground">رمز الخطأ: {error.digest}</p>}
      </div>
    </main>
  );
}
