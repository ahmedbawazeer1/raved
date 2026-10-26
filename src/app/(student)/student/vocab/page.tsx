import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { VocabDeck } from "@/components/vocab/vocab-deck";
import { requireActiveStudent } from "@/lib/auth/session";
import { parseFeatures } from "@/lib/paths/features";
import { getPrimaryPath } from "@/lib/student/queries";
import { getVocabDeck } from "@/lib/vocab/queries";

export const metadata: Metadata = { title: "المفردات" };

function whenLabel(iso: string): string {
  const hours = (new Date(iso).getTime() - Date.now()) / 3_600_000;
  if (hours < 1) return "بعد دقائق";
  if (hours < 24) return "خلال ساعات";
  const days = Math.round(hours / 24);
  return days <= 1 ? "غداً" : days === 2 ? "بعد يومين" : `بعد ${days} أيام`;
}

export default async function VocabPage() {
  const { userId } = await requireActiveStudent();
  const path = await getPrimaryPath(userId);
  const enabled = path && parseFeatures(path.features).vocab;
  const deck = enabled ? await getVocabDeck(userId, path.id) : null;

  return (
    <main className="mx-auto flex w-full max-w-[640px] flex-col gap-4 px-4 py-5">
      <h1 className="text-xl font-bold">مراجعة اليوم</h1>

      {!deck ? (
        <Card className="p-5 text-[15px] leading-relaxed text-muted-foreground">لا توجد مفردات في هذا المسار.</Card>
      ) : deck.learnedCount === 0 && deck.cards.length === 0 ? (
        <Card className="flex flex-col gap-2 p-5">
          <p className="font-bold">لا كلمات بعد</p>
          <p className="text-sm leading-relaxed text-muted-foreground">أكمل أول درس، وستظهر كلماته هنا لتراجعها بالبطاقات، حتى بلا إنترنت.</p>
          <Link href="/student" className="text-sm font-semibold">
            إلى جلسة اليوم ←
          </Link>
        </Card>
      ) : deck.cards.length === 0 ? (
        <Card className="flex flex-col gap-2 p-5">
          <p className="font-bold">راجعت كل الكلمات المستحقة 🎉</p>
          <p className="text-sm text-muted-foreground">
            تعرف الآن {deck.learnedCount} كلمة.{deck.nextDueAt ? ` المراجعة التالية ${whenLabel(deck.nextDueAt)}.` : ""}
          </p>
        </Card>
      ) : (
        <VocabDeck cards={deck.cards} />
      )}
    </main>
  );
}
