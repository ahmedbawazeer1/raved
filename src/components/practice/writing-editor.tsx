"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { submitWriting } from "@/app/(student)/student/practice/actions";
import { enqueue } from "@/lib/offline/queue";
import { countWords } from "@/lib/practice/text";
import { WritingSyncNotice, type QueuedWriting } from "./writing-sync";

const noop = () => () => {};
const draftKey = (lessonId: string, parentId: string | null) => `raved:writing:${lessonId}:${parentId ?? "new"}`;

function readDraft(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Waits for the browser so the saved draft can be read without a flash of empty text. */
export function WritingEditor(props: { lessonId: string; minWords: number; maxWords: number; initialText: string; parentId: string | null }) {
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  if (!hydrated) return <Card className="h-64 animate-pulse" aria-busy="true" />;
  return <Editor {...props} />;
}

function Editor({ lessonId, minWords, maxWords, initialText, parentId }: { lessonId: string; minWords: number; maxWords: number; initialText: string; parentId: string | null }) {
  const router = useRouter();
  const key = draftKey(lessonId, parentId);
  const [text, setText] = useState(() => readDraft(key) ?? initialText);
  const [clientId] = useState(() => crypto.randomUUID());
  const [message, setMessage] = useState<{ tone: "error" | "success" | "warning"; text: string } | null>(null);
  const [sending, startTransition] = useTransition();
  const words = countWords(text);
  const inRange = words >= minWords && words <= maxWords;

  function change(value: string) {
    setText(value);
    try {
      localStorage.setItem(key, value);
    } catch {
      // storage full or blocked: the text stays on screen
    }
  }

  async function saveOffline() {
    const payload: QueuedWriting = { lessonId, text, clientId, parentId };
    await enqueue("writing_submit", payload, clientId);
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
    setMessage({ tone: "warning", text: "لا يوجد اتصال. حفظنا كتابتك على جهازك، وسنرسلها للتصحيح عند عودة الاتصال." });
  }

  function submit() {
    setMessage(null);
    startTransition(async () => {
      if (!navigator.onLine) {
        await saveOffline();
        return;
      }
      let res;
      try {
        res = await submitWriting({ lessonId, text, clientId, parentId });
      } catch {
        await saveOffline();
        return;
      }
      if (res.id) {
        try {
          localStorage.removeItem(key);
        } catch {
          /* ignore */
        }
        router.push(`/student/practice/writing/result/${res.id}`);
      } else {
        setMessage({ tone: "error", text: res.error ?? "حدث خطأ." });
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <WritingSyncNotice />
      <Card className="flex flex-col gap-2 p-3">
        <label htmlFor="writing" className="sr-only">
          كتابتك بالإنجليزية
        </label>
        <textarea
          id="writing"
          dir="ltr"
          lang="en"
          value={text}
          onChange={(e) => change(e.target.value)}
          rows={10}
          maxLength={6000}
          spellCheck={false}
          autoCapitalize="sentences"
          placeholder="Write here…"
          className="min-h-56 w-full resize-y rounded-xl border border-input bg-card p-3 font-en text-[16px] leading-relaxed focus-visible:outline-2 focus-visible:outline-ring"
        />
        <div className="flex items-center justify-between text-[13px]">
          <span className={inRange ? "font-semibold text-success" : "text-muted-foreground"}>
            {words} كلمة {inRange ? "✓" : `(المطلوب ${minWords}–${maxWords})`}
          </span>
          <span className="text-muted-foreground">تُحفظ المسودة تلقائياً على جهازك</span>
        </div>
      </Card>
      {message && <Alert tone={message.tone}>{message.text}</Alert>}
      <Button size="lg" onClick={submit} disabled={sending || words === 0}>
        {sending ? "جارٍ الإرسال…" : "أرسل للتصحيح"}
      </Button>
    </div>
  );
}
