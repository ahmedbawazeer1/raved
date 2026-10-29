"use client";

import { useState, useTransition } from "react";
import { Send, Star, Volume2 } from "lucide-react";
import { Alert } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { En } from "@/components/en";
import { MixedText } from "@/components/mixed-text";
import { askRoleplay } from "@/app/(student)/student/practice/actions";
import { speak } from "@/lib/tts";

interface Message {
  role: "user" | "assistant";
  content: string;
}

/** Conversation in English with the unit's Hadrami character. History stays on the page only. */
export function RoleplayChat({
  unitId,
  character,
  opening,
  initialRemaining,
}: {
  unitId: string;
  character: string;
  opening: string;
  initialRemaining: number;
}) {
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", content: opening }]);
  const [input, setInput] = useState("");
  const [remaining, setRemaining] = useState(initialRemaining);
  const [counted, setCounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  function send(text: string) {
    const said = text.trim();
    if (!said || busy) return;
    setError(null);
    const next = [...messages, { role: "user" as const, content: said }];
    setMessages(next);
    setInput("");
    startTransition(async () => {
      const res = await askRoleplay({ unitId, messages: next.slice(-40) }).catch(
        () => ({ error: "لا يوجد اتصال. المحادثة تحتاج إنترنت." }) as { error: string; reply?: string; remaining?: number; counted?: boolean },
      );
      if (res.reply) {
        setMessages([...next, { role: "assistant", content: res.reply }]);
        if (typeof res.remaining === "number") setRemaining(res.remaining);
        if (res.counted) setCounted(true);
      } else {
        setError(res.error ?? "حدث خطأ.");
        setMessages(messages);
        setInput(said);
      }
    });
  }

  return (
    <div className="flex flex-1 flex-col">
      <main className="mx-auto flex w-full max-w-[640px] flex-1 flex-col gap-3 p-4" aria-live="polite">
        <p className="rounded-2xl bg-card p-4 text-sm leading-relaxed text-muted-foreground">
          تحدث بالإنجليزية مع <strong className="text-foreground">{character}</strong>. اكتب جملاً قصيرة، والشخصية تصحح أخطاءك بلطف. بعد 4 رسائل تحصل على 5 نقاط.
        </p>
        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="max-w-[85%] self-start rounded-2xl rounded-ss-sm bg-primary px-4 py-2.5 text-[15px] leading-relaxed text-white">
              <MixedText text={m.content} />
            </div>
          ) : (
            <div key={i} className="max-w-[90%] self-end rounded-2xl rounded-se-sm border border-ai-tint bg-card px-4 py-3 text-[15px] leading-relaxed">
              <span className="mb-1 flex items-center justify-between gap-2 text-xs font-semibold text-ai">
                {character}
                <button type="button" onClick={() => speak(m.content, { rate: 0.85 })} aria-label="استمع">
                  <Volume2 className="size-4" aria-hidden="true" />
                </button>
              </span>
              <En as="div">{m.content}</En>
            </div>
          ),
        )}
        {busy && <p className="self-end text-sm text-muted-foreground">يكتب…</p>}
        {counted && (
          <p role="status" className="flex items-center gap-1.5 rounded-xl bg-warning-tint p-2.5 text-sm font-semibold text-warning">
            <Star className="size-4 fill-current" aria-hidden="true" />
            أحسنت! حُسبت لك نقاط المحادثة
          </p>
        )}
        {error && <Alert tone="warning">{error}</Alert>}
        <p className="text-xs text-muted-foreground">{remaining} رسالة متبقية اليوم (من رصيد المساعد) · يحتاج اتصالاً · الردود تقديرية</p>
      </main>
      <form
        className="sticky bottom-[68px] border-t border-border bg-card px-4 py-3 md:bottom-0"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <div className="mx-auto flex max-w-[640px] gap-2">
          <label htmlFor="say" className="sr-only">
            رسالتك بالإنجليزية
          </label>
          <input
            id="say"
            dir="ltr"
            lang="en"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={500}
            placeholder="Write in English…"
            className="min-h-12 flex-1 rounded-xl border border-input bg-card px-3.5 font-en text-[15px]"
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
