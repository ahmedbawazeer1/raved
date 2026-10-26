"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, CloudOff, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { En } from "@/components/en";
import { ProgressBar } from "@/components/student/progress-bar";
import { saveVocabReviews, type VocabReviewInput } from "@/app/(student)/student/vocab/actions";
import { enqueue, flush, pending, type QueueItem } from "@/lib/offline/queue";
import type { Grade } from "@/lib/srs";
import { speak, useEnglishVoice, useSpeechSupported } from "@/lib/tts";
import type { DeckCard } from "@/lib/vocab/deck";

type Payload = Omit<VocabReviewInput, "id">;

const GRADE_BUTTONS: { grade: Grade; label: string; className: string }[] = [
  { grade: "again", label: "نسيتها", className: "bg-destructive-tint text-destructive hover:bg-destructive-tint hover:text-destructive" },
  { grade: "hard", label: "صعبة", className: "bg-warning-tint text-warning hover:bg-warning-tint hover:text-warning" },
  { grade: "good", label: "أعرفها", className: "bg-success-tint text-success hover:bg-success-tint hover:text-success" },
];

async function send(items: QueueItem<Payload>[]): Promise<string[]> {
  const { accepted } = await saveVocabReviews(items.map((i) => ({ id: i.id, ...i.payload })));
  return accepted;
}

/** Flip cards with the phone's voice. Each answer is saved on the device first, then sent. */
export function VocabDeck({ cards: initial }: { cards: DeckCard[] }) {
  const [cards, setCards] = useState<DeckCard[] | null>(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [requeued, setRequeued] = useState<Set<string>>(() => new Set());
  const [reviewed, setReviewed] = useState(0);
  const [unsent, setUnsent] = useState(0);
  const speechSupported = useSpeechSupported();
  const hasVoice = useEnglishVoice();

  const sync = useCallback(async () => {
    try {
      if (navigator.onLine) await flush<Payload>("vocab_review", send);
    } catch {
      // Offline or server unreachable: the reviews stay queued.
    }
    try {
      setUnsent((await pending("vocab_review")).length);
    } catch {
      setUnsent(0);
    }
  }, []);

  // Words already answered on this device (e.g. offline earlier) are not asked again.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let skip = new Set<string>();
      try {
        skip = new Set((await pending<Payload>("vocab_review")).map((i) => i.payload.vocabItemId));
      } catch {
        // IndexedDB unavailable (private mode): review without the offline queue.
      }
      if (!cancelled) setCards(initial.filter((c) => !skip.has(c.id)));
      await sync();
    })();
    window.addEventListener("online", sync);
    return () => {
      cancelled = true;
      window.removeEventListener("online", sync);
      window.speechSynthesis?.cancel();
    };
  }, [initial, sync]);

  if (cards === null) return <Card className="h-80 animate-pulse" aria-busy="true" />;

  const card = cards[index];
  if (!card) {
    return (
      <Card className="flex flex-col items-center gap-3 p-6 text-center">
        <CheckCircle2 className="size-12 text-success" aria-hidden="true" />
        <p className="text-lg font-bold">{reviewed ? `أحسنت! راجعت ${reviewed} كلمة اليوم.` : "لا كلمات للمراجعة الآن."}</p>
        {unsent > 0 ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CloudOff className="size-4" aria-hidden="true" />
            {unsent} مراجعة محفوظة على جهازك وستُرسل عند عودة الاتصال.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">سنذكّرك بالكلمات في الوقت المناسب حتى لا تنساها.</p>
        )}
        <Button asChild className="w-full">
          <Link href="/student">إلى جلسة اليوم</Link>
        </Button>
      </Card>
    );
  }

  async function grade(g: Grade) {
    try {
      await enqueue<Payload>("vocab_review", { vocabItemId: card.id, grade: g, reviewedAt: new Date().toISOString() });
    } catch {
      // No IndexedDB: send directly.
      await saveVocabReviews([{ id: crypto.randomUUID(), vocabItemId: card.id, grade: g, reviewedAt: new Date().toISOString() }]).catch(() => undefined);
    }
    // «نسيتها»: the word comes back once more at the end of this session.
    if (g === "again" && !requeued.has(card.id)) {
      setRequeued(new Set(requeued).add(card.id));
      setCards([...cards!, card]);
    }
    setReviewed((n) => (requeued.has(card.id) ? n : n + 1));
    setFlipped(false);
    setIndex((i) => i + 1);
    void sync();
  }

  const canSpeak = speechSupported !== false && hasVoice;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[13px] text-muted-foreground">
          <span>
            {index + 1} من {cards.length}
          </span>
          <span className="flex items-center gap-1.5">
            {unsent > 0 && <CloudOff className="size-3.5" aria-hidden="true" />}
            {unsent > 0 ? `${unsent} بانتظار الإرسال` : "تعمل بلا إنترنت"}
          </span>
        </div>
        <ProgressBar value={index} max={cards.length} label="تقدم المراجعة" />
      </div>

      <button
        type="button"
        onClick={() => setFlipped(!flipped)}
        aria-label={flipped ? "أخفِ المعنى" : "اقلب البطاقة"}
        className="flex min-h-80 flex-col items-center justify-center gap-3 rounded-[20px] border border-border bg-card p-5 text-center text-foreground"
      >
        <En className="text-[34px] font-bold">{card.word}</En>
        {card.ipa && <En className="text-[15px] text-muted-foreground">{card.ipa}</En>}
        {flipped ? (
          <>
            <span className="text-[22px] font-bold text-primary">{card.meaningAr}</span>
            <En as="p" className="text-[15px] leading-relaxed text-subtle">
              {card.exampleEn}
            </En>
            {card.exampleAr && <span className="text-sm text-muted-foreground">{card.exampleAr}</span>}
          </>
        ) : (
          <span className="text-[13px] text-muted-foreground">اضغط لرؤية المعنى</span>
        )}
      </button>

      {canSpeak && (
        <Button
          variant="secondary"
          className="self-center"
          onClick={() => speak(flipped ? `${card.word}. ${card.exampleEn}` : card.word, { rate: 0.85 })}
        >
          <Volume2 className="size-[18px]" aria-hidden="true" />
          استمع للنطق
        </Button>
      )}

      {flipped && (
        <div className="grid grid-cols-3 gap-2">
          {GRADE_BUTTONS.map((b) => (
            <Button key={b.grade} className={`px-2 ${b.className}`} onClick={() => grade(b.grade)}>
              {b.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
