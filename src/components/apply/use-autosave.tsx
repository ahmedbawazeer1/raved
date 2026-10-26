"use client";

import { useEffect, useRef, useState } from "react";

export type AutosaveStatus = "idle" | "saving" | "saved" | "offline" | "error";

/** Debounced autosave of form values (drafts never get lost on weak connections). */
export function useAutosave<T>(values: T, save: (values: T) => Promise<{ ok: boolean }>, delay = 900): AutosaveStatus {
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const first = useRef(true);
  const serialized = JSON.stringify(values);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const timer = setTimeout(async () => {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setStatus("offline");
        return;
      }
      setStatus("saving");
      try {
        const res = await save(JSON.parse(serialized) as T);
        setStatus(res.ok ? "saved" : "error");
      } catch {
        setStatus(navigator.onLine ? "error" : "offline");
      }
    }, delay);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run only when the values change
  }, [serialized]);

  return status;
}

export function AutosaveNote({ status }: { status: AutosaveStatus }) {
  const text: Record<AutosaveStatus, string> = {
    idle: "",
    saving: "جارٍ حفظ المسودة…",
    saved: "حُفظت المسودة",
    offline: "بلا إنترنت: سنحفظ عند عودة الاتصال",
    error: "تعذر حفظ المسودة",
  };
  return (
    <p aria-live="polite" className="min-h-5 text-xs text-muted-foreground">
      {text[status]}
    </p>
  );
}
