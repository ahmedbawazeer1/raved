import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-10">
      <div className="mx-auto flex max-w-[460px] flex-col items-center gap-3.5 text-center">
        <p className="text-5xl font-bold text-primary">404</p>
        <h1 className="text-2xl font-bold">الصفحة غير موجودة</h1>
        <p className="text-[15px] leading-[1.9] text-muted-foreground">
          ربما تغيّر الرابط، أو أن هذه الصفحة لم تُبنَ بعد.
        </p>
        <Button asChild className="w-full">
          <Link href="/">الصفحة الرئيسية</Link>
        </Button>
      </div>
    </main>
  );
}
