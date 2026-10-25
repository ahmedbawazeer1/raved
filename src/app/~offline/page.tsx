import type { Metadata } from "next";
import Link from "next/link";
import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "لا يوجد اتصال" };

// Precached by the service worker and shown when a page can't load offline (design/Offline*.dc.html).
export default function OfflinePage() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-10">
      <div className="mx-auto flex max-w-[460px] flex-col items-center gap-3.5 text-center">
        <span className="flex size-20 items-center justify-center rounded-full bg-warning-tint text-warning">
          <WifiOff className="size-[38px]" aria-hidden="true" />
        </span>
        <h1 className="text-2xl font-bold">لا يوجد اتصال بالإنترنت</h1>
        <p className="text-[15px] leading-[1.9] text-muted-foreground">
          هذه الصفحة تحتاج اتصالاً. لكن تستطيع متابعة الدراسة من الوحدات المنزّلة، وتقدمك سيُرسل تلقائياً عند عودة
          الاتصال.
        </p>
        {/* Downloads and offline vocab arrive in phases 3 and 4; until then offer the home page. */}
        <Button asChild className="w-full">
          <Link href="/">الصفحة الرئيسية</Link>
        </Button>
        <p className="text-[13px] text-muted-foreground">سنحاول من جديد عندما يعود الاتصال.</p>
      </div>
    </main>
  );
}
