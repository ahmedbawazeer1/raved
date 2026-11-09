"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/errors/client";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { Rafed } from "@/components/art/rafed";
import { Button } from "@/components/ui/button";

/** Shown instead of the browser's English error page when a page fails on the server. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => reportError(error, error.digest), [error]);
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-10">
      <div className="mx-auto flex max-w-[460px] flex-col items-center gap-3.5 text-center">
        <Rafed size={110} mood="think" move="oops" moveKey={1} />
        <h1 className="text-2xl font-bold">حدث خطأ</h1>
        <p className="text-[15px] leading-[1.9] text-muted-foreground">أبلغنا الفريق تلقائياً، وما كتبته محفوظ. جرّب مرة أخرى.</p>
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
