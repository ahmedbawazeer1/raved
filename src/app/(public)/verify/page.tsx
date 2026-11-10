import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "تحقق من شهادة" };

async function go(formData: FormData) {
  "use server";
  const code = String(formData.get("code") ?? "")
    .trim()
    .replace(/[^A-Za-z0-9-]/g, "")
    .slice(0, 40);
  if (code) redirect(`/verify/${code}`);
}

/** Anyone can check a completion certificate by its code. */
export default function VerifyPage() {
  return (
    <main className="mx-auto flex max-w-[520px] flex-col gap-4 px-4 py-12 md:py-20">
      <h1 className="text-3xl font-bold">تحقق من شهادة</h1>
      <p className="leading-relaxed text-muted-foreground">اكتب رمز التحقق المكتوب على شهادة الإتمام، وسنعرض لك صاحبها ومستواها وتاريخها.</p>
      <form action={go} className="flex flex-col gap-3">
        <label htmlFor="code" className="font-semibold">
          رمز التحقق
        </label>
        <input
          id="code"
          name="code"
          required
          dir="ltr"
          autoComplete="off"
          className="min-h-12 rounded-2xl border-2 border-border bg-card px-4 font-en text-lg focus:border-primary focus:outline-none"
        />
        <Button type="submit" size="lg">
          تحقق
        </Button>
      </form>
    </main>
  );
}
