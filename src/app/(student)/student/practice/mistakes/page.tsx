import type { Metadata } from "next";
import { TopBar } from "@/components/student/top-bar";
import { MistakesReview } from "@/components/lesson/mistakes-review";

export const metadata: Metadata = { title: "تدرّب على أخطائك" };

export default function MistakesPage() {
  return (
    <>
      <TopBar backHref="/student/practice" title="تدرّب على أخطائك" subtitle="من تمارين الدروس · محفوظة على هذا الجهاز" />
      <main className="mx-auto flex w-full max-w-[680px] flex-col gap-4 px-4 py-5">
        <MistakesReview />
      </main>
    </>
  );
}
