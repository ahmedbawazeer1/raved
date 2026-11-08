import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { CreatePathForm } from "@/components/studio/forms";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = { title: "مسار جديد" };

export default async function NewPathPage() {
  await requireAdmin();
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">
          <Link href="/studio">المسارات والمناهج</Link> ← مسار جديد
        </p>
        <h1 className="text-2xl font-bold">مسار جديد</h1>
        <p className="text-muted-foreground">
          يبقى المسار مخفياً عن الطلاب حتى تنشره. بعد إنشائه تضيف مستوياته، ثم يخطط «عقل رفد» خريطة كل مستوى ويبني وحداته.
        </p>
      </header>
      <Card className="p-5">
        <CreatePathForm />
      </Card>
    </div>
  );
}
