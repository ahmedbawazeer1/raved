import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { ListenRepeat } from "@/components/practice/listen-repeat";
import { PracticeHeader } from "@/components/practice/practice-header";
import { requireActiveStudent } from "@/lib/auth/session";
import { getPrimaryPath } from "@/lib/student/queries";
import { getLearnedWords } from "@/lib/vocab/queries";

export const metadata: Metadata = { title: "استمع وكرّر" };

export default async function ListenRepeatPage() {
  const { userId } = await requireActiveStudent();
  const path = await getPrimaryPath(userId);
  const words = path ? await getLearnedWords(userId, path.id) : [];
  const sentences = [...new Map(words.map((w) => [w.exampleEn, { en: w.exampleEn, ar: w.exampleAr }])).values()];

  return (
    <div className="flex flex-col">
      <PracticeHeader backHref="/student/practice" overline="تدريب بلا إنترنت" title="استمع وكرّر" />
      <main className="mx-auto flex w-full max-w-[640px] flex-col gap-3 p-4">
        {sentences.length ? (
          <ListenRepeat sentences={sentences} />
        ) : (
          <Card className="p-5 text-sm text-muted-foreground">أكمل أول درس لتظهر جمله هنا.</Card>
        )}
      </main>
    </div>
  );
}
