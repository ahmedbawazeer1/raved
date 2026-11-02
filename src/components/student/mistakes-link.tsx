"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { mistakesStore, parseMistakes } from "@/lib/mistakes";

/** «تدرّب على أخطائك», shown only when the device has saved mistakes. */
export function MistakesLink() {
  const count = parseMistakes(useSyncExternalStore(mistakesStore.subscribe, mistakesStore.getSnapshot, mistakesStore.getServerSnapshot)).length;
  if (count === 0) return null;
  return (
    <Link
      href="/student/practice/mistakes"
      className="flex min-h-14 items-center gap-3 rounded-2xl border border-destructive-tint bg-card px-4 py-3 text-foreground no-underline hover:text-foreground"
    >
      <RotateCcw className="size-6 flex-none text-destructive" aria-hidden="true" />
      <span className="flex-1">
        <span className="block font-semibold">تدرّب على أخطائك</span>
        <span className="block text-[13px] text-muted-foreground">{count} تمرين أخطأت فيه · تعمل بلا إنترنت</span>
      </span>
    </Link>
  );
}
