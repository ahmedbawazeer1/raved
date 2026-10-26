import type { Metadata } from "next";
import { PrintButton } from "@/components/apply/print-button";

export const metadata: Metadata = {
  title: "نموذج توصية المعلم",
  description: "نموذج توصية جاهز للطباعة يكتبه معلم الطالب ويوقّعه.",
};

const Line = () => <span className="block h-8 border-b border-dashed border-[#9AA8A4]" />;

export default function RecommendationTemplatePage() {
  return (
    <main className="mx-auto max-w-[720px] px-4 py-8 print:max-w-none print:p-0">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="text-sm text-muted-foreground">اطبع هذه الصفحة وأعطها لمعلمك، ثم صوّرها بعد التوقيع وارفعها في طلبك.</p>
        <PrintButton />
      </div>

      <article className="rounded-2xl border border-border bg-card p-8 leading-[2] print:border-0 print:p-0">
        <header className="mb-6 flex items-center justify-between">
          {/* eslint-disable-next-line @next/next/no-img-element -- tiny static SVG */}
          <img src="/brand/raved-logo-green.svg" alt="شعار رفد" width={40} height={48} className="h-12 w-auto" />
          <p className="text-sm text-muted-foreground">التاريخ: ____ / ____ / ________</p>
        </header>
        <h1 className="mb-4 text-center text-2xl font-bold">توصية معلم لطالب يلتحق بمنصة رفد</h1>
        <p className="mb-4">
          رفد منصة تعليمية مجانية لطلاب الثانوية في اليمن. نطلب توصية قصيرة من معلم في مدرسة الطالب لنتأكد من جديته
          في التعلم. لا نرى هذه الورقة إلا نحن (فريق الإدارة)، ونحذفها بعد 90 يوماً من قرار القبول.
        </p>

        <section className="mb-4">
          <p>
            <b>اسم الطالب:</b>
          </p>
          <Line />
          <p className="mt-2">
            <b>الصف والمدرسة:</b>
          </p>
          <Line />
        </section>

        <section className="mb-4">
          <p>
            <b>أنا المعلم/ة:</b>
          </p>
          <Line />
          <p className="mt-2">
            <b>المادة التي أدرّسها للطالب:</b>
          </p>
          <Line />
        </section>

        <section className="mb-4">
          <p>
            <b>أشهد أن الطالب جاد في التعلم، لأن:</b> (سطران أو ثلاثة)
          </p>
          <Line />
          <Line />
          <Line />
        </section>

        <section className="mt-8 grid grid-cols-2 gap-8">
          <div>
            <p>
              <b>التوقيع:</b>
            </p>
            <Line />
          </div>
          <div>
            <p>
              <b>رقم تواصل المعلم (اختياري):</b>
            </p>
            <Line />
          </div>
        </section>
      </article>
    </main>
  );
}
