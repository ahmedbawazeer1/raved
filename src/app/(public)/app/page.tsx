import type { Metadata } from "next";
import Link from "next/link";
import { Download, ShieldCheck, Smartphone, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ANDROID_APK_URL } from "@/lib/android";

export const metadata: Metadata = {
  title: "تطبيق رفد لأندرويد",
  description: "حمّل تطبيق رفد لأندرويد: نفس حسابك ودروسك، يفتح بلمسة من الشاشة الرئيسية ويعمل بلا إنترنت.",
};

const STEPS = [
  "اضغط «حمّل التطبيق» من جوالك الأندرويد، وانتظر حتى ينتهي التنزيل (أقل من 1 ميغابايت).",
  "افتح الملف raved.apk من الإشعارات أو من مجلد التنزيلات.",
  "إذا ظهرت رسالة «لا يُسمح بتثبيت تطبيقات من هذا المصدر»: اضغط «الإعدادات» ثم فعّل «السماح من هذا المصدر» وارجع.",
  "اضغط «تثبيت»، ثم «فتح». ادخل بنفس بريدك وكلمة مرورك.",
];

export default function AndroidAppPage() {
  return (
    <main className="mx-auto flex w-full max-w-[720px] flex-col gap-5 px-4 py-8 md:py-14">
      <header className="flex flex-col items-center gap-3 text-center">
        <span className="flex size-20 items-center justify-center rounded-3xl bg-primary text-white shadow-lg">
          <Smartphone className="size-10" aria-hidden="true" />
        </span>
        <h1 className="text-[28px] font-bold md:text-4xl">رفد على جوالك الأندرويد</h1>
        <p className="max-w-[520px] text-[15px] leading-[1.9] text-muted-foreground md:text-lg">
          نفس حسابك ودروسك وتقدمك. يفتح بلمسة من الشاشة الرئيسية بملء الشاشة، ويعمل بلا إنترنت مثل الموقع تماماً.
        </p>
        <Button asChild variant="accent" size="lg" className="w-full md:w-auto">
          <a href={ANDROID_APK_URL} download>
            <Download className="size-5" aria-hidden="true" />
            حمّل التطبيق (APK)
          </a>
        </Button>
        <p className="text-xs text-muted-foreground">مجاني · أندرويد 5 فما فوق · يحتاج متصفح Chrome على الجوال</p>
      </header>

      <Card className="flex flex-col gap-3 p-5">
        <h2 className="text-lg font-bold">طريقة التثبيت</h2>
        <ol className="flex flex-col gap-3">
          {STEPS.map((s, i) => (
            <li key={i} className="flex gap-3 text-[15px] leading-[1.8]">
              <span className="flex size-8 flex-none items-center justify-center rounded-full bg-primary-tint font-bold text-primary-hover">{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        <Card className="flex gap-3 p-4">
          <WifiOff className="size-6 flex-none text-primary" aria-hidden="true" />
          <p className="text-sm leading-[1.8]">
            <b>بلا إنترنت:</b> نزّل الوحدات من داخل التطبيق كما في الموقع، وادرس في أي مكان. تقدمك يُرسل عند عودة الاتصال.
          </p>
        </Card>
        <Card className="flex gap-3 p-4">
          <ShieldCheck className="size-6 flex-none text-primary" aria-hidden="true" />
          <p className="text-sm leading-[1.8]">
            <b>آمن:</b> التطبيق موقّع من رفد، ولا يطلب صلاحيات غير الإنترنت والإشعارات. حمّله فقط من هذه الصفحة.
          </p>
        </Card>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        لا تملك أندرويد؟ افتح <Link href="/">الموقع</Link> من أي متصفح، ومن قائمة المتصفح اختر «إضافة إلى الشاشة الرئيسية».
      </p>
    </main>
  );
}
