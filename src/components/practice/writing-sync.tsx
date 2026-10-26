"use client";

import { useEffect, useState } from "react";
import { CloudOff } from "lucide-react";
import { submitWriting } from "@/app/(student)/student/practice/actions";
import { flush, pending } from "@/lib/offline/queue";

export interface QueuedWriting {
  lessonId: string;
  text: string;
  clientId: string;
  parentId: string | null;
}

/** Sends writings saved offline as soon as the connection is back. */
export function useWritingSync(): number {
  const [unsent, setUnsent] = useState(0);
  useEffect(() => {
    async function sync() {
      try {
        if (navigator.onLine) {
          await flush<QueuedWriting>("writing_submit", async (items) => {
            const accepted: string[] = [];
            for (const item of items) {
              const res = await submitWriting(item.payload).catch(() => null);
              if (res?.id) accepted.push(item.id);
            }
            return accepted;
          });
        }
        setUnsent((await pending("writing_submit")).length);
      } catch {
        // offline or no IndexedDB: try again later
      }
    }
    void sync();
    window.addEventListener("online", sync);
    return () => window.removeEventListener("online", sync);
  }, []);
  return unsent;
}

export function WritingSyncNotice() {
  const unsent = useWritingSync();
  if (!unsent) return null;
  return (
    <p className="flex items-center gap-2 rounded-xl bg-warning-tint p-3 text-sm text-[#5C3D00]">
      <CloudOff className="size-4 flex-none" aria-hidden="true" />
      {unsent === 1 ? "كتابة واحدة محفوظة" : `${unsent} كتابات محفوظة`} على جهازك، وسنرسلها للتصحيح عند عودة الاتصال.
    </p>
  );
}
