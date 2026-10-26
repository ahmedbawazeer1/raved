"use client";

import { useState, useTransition } from "react";
import { Send } from "lucide-react";
import { Alert } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { MixedText } from "@/components/mixed-text";
import { askAssistant } from "@/app/(student)/student/practice/actions";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = ["أعطني مثالاً آخر", "اشرح بطريقة أبسط"];

/** Chat scoped to one lesson. History stays in the page (last 6 messages go to the server). */
export function AssistantChat({ lessonId, initialRemaining }: { lessonId: string; initialRemaining: number }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [remaining, setRemaining] = useState(initialRemaining);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  function send(text: string) {
    const question = text.trim();
    if (!question || busy) return;
    setError(null);
    const next = [...messages, { role: "user" as const, content: question }];
    setMessages(next);
    setInput("");
    startTransition(async () => {
      const res = await askAssistant({ lessonId, messages: next.slice(-6) }).catch(() => ({ error: "لا يوجد اتصال. المساعد يحتاج إنترنت." }) as { error: string; reply?: string; remaining?: number });
      if (res.reply) {
        setMessages([...next, { role: "assistant", content: res.reply }]);
        if (typeof res.remaining === "number") setRemaining(res.remaining);
      } else {
        setError(res.error ?? "حدث خطأ.");
        setMessages(messages);
        setInput(question);
      }
    });
  }

  return (
    <div className="flex flex-1 flex-col">
      <main className="mx-auto flex w-full max-w-[640px] flex-1 flex-col gap-3 p-4" aria-live="polite">
        {messages.length === 0 && (
          <p className="rounded-2xl bg-card p-4 text-sm leading-relaxed text-muted-foreground">
            اسأل عن أي شيء في هذا الدرس: قاعدة لم تفهمها، أو كلمة، أو مثال إضافي. المساعد يشرح ولا يحل المهام بدلاً عنك.
          </p>
        )}
        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="max-w-[85%] self-start rounded-2xl rounded-ss-sm bg-primary px-4 py-2.5 text-[15px] leading-relaxed text-white">
              <MixedText text={m.content} />
            </div>
          ) : (
            <div key={i} className="max-w-[90%] self-end rounded-2xl rounded-se-sm border border-ai-tint bg-card px-4 py-3 text-[15px] leading-relaxed whitespace-pre-line">
              <span className="mb-1 block text-xs font-semibold text-ai">المساعد · تقديري</span>
              <MixedText text={m.content} />
            </div>
          ),
        )}
        {busy && <p className="self-end text-sm text-muted-foreground">يكتب…</p>}
        {messages.length > 0 && !busy && (
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button key={s} type="button" onClick={() => send(s)} className="min-h-9 rounded-full bg-muted px-3 text-sm font-semibold text-subtle">
                {s}
              </button>
            ))}
          </div>
        )}
        {error && <Alert tone="warning">{error}</Alert>}
        <p className="text-xs text-muted-foreground">{remaining} سؤالاً متبقياً اليوم · يحتاج اتصالاً · يجيب عن الدرس فقط</p>
      </main>
      <form
        className="sticky bottom-[68px] border-t border-border bg-card px-4 py-3 md:bottom-0"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <div className="mx-auto flex max-w-[640px] gap-2">
          <label htmlFor="question" className="sr-only">
            سؤالك
          </label>
          <input
            id="question"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={1000}
            placeholder="اكتب سؤالك بالعربية"
            className="min-h-12 flex-1 rounded-xl border border-input bg-card px-3.5 text-[15px]"
            disabled={remaining <= 0}
          />
          <Button type="submit" aria-label="إرسال" disabled={busy || remaining <= 0 || !input.trim()}>
            <Send className="size-5 rtl:-scale-x-100" aria-hidden="true" />
          </Button>
        </div>
      </form>
    </div>
  );
}
