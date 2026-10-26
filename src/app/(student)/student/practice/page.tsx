import type { Metadata } from "next";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "التدريب" };

export default function Page() {
  return (
    <main className="mx-auto flex w-full max-w-[640px] flex-col gap-4 px-4 py-5">
      <h1 className="text-2xl font-bold">التدريب</h1>
      <Card className="p-5 text-[15px] leading-relaxed text-muted-foreground">تدريب المحادثة والكتابة مع تصحيح آلي. يُفتح قريباً.</Card>
    </main>
  );
}
