import Link from "next/link";
import { CheckCircle2, Circle, Download, Mic, PlayCircle, ShieldCheck, Smartphone, WifiOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { En } from "@/components/en";
import { PathIcon } from "@/components/site/path-icon";
import { getPublicPaths } from "@/lib/paths/catalog";

const features = [
  {
    icon: Download,
    title: "يعمل بلا إنترنت",
    text: "نزّل الوحدة مرة واحدة وادرسها حتى لو انقطع الاتصال أو الكهرباء. تقدمك يُحفظ ويُرسل لاحقاً.",
  },
  { icon: Smartphone, title: "خفيف على الباقة", text: "النص أولاً، والفيديو اختياري. يعمل على الهواتف المتوسطة." },
  {
    icon: Mic,
    title: "محادثة وكتابة مع تصحيح",
    text: "تكلّم أو اكتب بالإنجليزية واحصل على تصحيح فوري بالعربية.",
  },
  { icon: ShieldCheck, title: "مجاني بالكامل", text: "بلا اشتراك وبلا إعلانات. لطلاب الثانوية في كل محافظات اليمن." },
];

const faqs = [
  {
    q: "هل رفد مجانية؟",
    a: "نعم بالكامل. لا اشتراك ولا إعلانات. رسوم الامتحان الدولي تدفعها لجهة الامتحان فقط عندما تقرر التقدم.",
  },
  {
    q: "الإنترنت عندي ضعيف، هل أستطيع الدراسة؟",
    a: "نعم. نزّل الوحدة عندما يتوفر الاتصال، وادرسها بلا إنترنت. نحفظ تقدمك ونرسله تلقائياً عند عودة الاتصال.",
  },
  {
    q: "أبدأ من الصفر في الإنجليزي، هل يناسبني؟",
    a: "نعم. اختبار تحديد المستوى يضعك في المكان المناسب، حتى لو كنت تعرف الحروف فقط.",
  },
  {
    q: "هل تعطيني رفد شهادة IELTS؟",
    a: "لا. رفد تجهزك للامتحان، والشهادة الدولية تأخذها من جهة الامتحان. نعطيك شهادة إتمام داخلية لكل مستوى.",
  },
  { q: "متى تُفتح المسارات الأخرى؟", a: "بعد استقرار مسار الإنجليزي. اضغط «أبلغني» على المسار الذي يهمك." },
];

export default function HomePage() {
  const paths = getPublicPaths();
  const featured = paths.find((p) => p.status === "published");
  const others = paths.filter((p) => p !== featured);

  return (
    <main>
      {/* Hero */}
      <section className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-14 px-4 pt-7 pb-5 md:px-6 md:pt-[72px] md:pb-16">
        <div className="flex flex-[1_1_480px] flex-col gap-3.5 md:gap-[22px]">
          <Badge tone="warning" className="self-start md:h-[30px]">
            <span className="md:hidden">مجانية لطلاب الثانوية في اليمن</span>
            <span className="hidden md:inline">مجانية بالكامل لطلاب الثانوية في اليمن</span>
          </Badge>
          <h1 className="text-[28px] leading-normal font-bold md:text-5xl md:leading-[1.35]">
            مسارات تعليمية واضحة، <span className="text-primary">تبدأ من الصفر وتعمل حتى بلا إنترنت</span>
          </h1>
          <p className="max-w-[580px] text-[15px] leading-[1.9] text-muted-foreground md:text-[19px]">
            اختر مسارك وادرس كل يوم قليلاً بشرح عربي. أول مساراتنا:{" "}
            <b className="text-foreground">الإنجليزية من الصفر حتى الشهادة الدولية</b> قبل أن تتخرج.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="accent" size="lg" className="w-full md:w-auto">
              <Link href="/signup">ابدأ مجاناً</Link>
            </Button>
            <Button asChild variant="secondary" size="lg" className="hidden md:inline-flex">
              <Link href="/paths">تصفح المسارات</Link>
            </Button>
          </div>
        </div>

        {/* Preview of "today's session" while offline (desktop only, as in the design) */}
        <div className="hidden flex-[1_1_400px] justify-center md:flex">
          <Card className="w-full max-w-[420px] overflow-hidden shadow-[0_20px_50px_rgba(18,32,29,.08)]" aria-hidden="true">
            <div className="flex items-center gap-2 bg-warning-tint px-3.5 py-2 text-[13px] font-medium text-[#5C3D00]">
              <WifiOff className="size-4" />
              بلا إنترنت · تقدمك محفوظ وسيُرسل لاحقاً
            </div>
            <div className="flex flex-col gap-1.5 p-5">
              <div className="mb-1.5 flex items-center justify-between">
                <p className="font-bold">جلسة اليوم</p>
                <Badge>25 دقيقة</Badge>
              </div>
              <PreviewRow icon={<CheckCircle2 className="size-5 text-success" />}>مراجعة 18 كلمة</PreviewRow>
              <PreviewRow icon={<CheckCircle2 className="size-5 text-success" />}>
                قواعد: <En>How much / How many</En>
              </PreviewRow>
              <PreviewRow icon={<PlayCircle className="size-5 text-primary" />} badge={<Badge tone="success">منزّلة</Badge>}>
                <span className="font-semibold">قراءة: في سوق تعز</span>
              </PreviewRow>
              <PreviewRow icon={<Circle className="size-5 text-[#9AA8A4]" />} badge={<Badge tone="muted">عند الاتصال</Badge>}>
                محادثة: اشترِ هدية
              </PreviewRow>
            </div>
          </Card>
        </div>
      </section>

      {/* Paths */}
      <section id="paths" className="px-4 pb-5 md:border-y md:border-border md:bg-card md:px-0 md:py-16">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-2.5 md:gap-6 md:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-[19px] font-bold md:text-[32px]">المسارات</h2>
              <p className="mt-1.5 hidden text-base text-muted-foreground md:block">مسار واحد متاح الآن، ومسارات جديدة قريباً</p>
            </div>
            <Link href="/paths" className="hidden md:inline">
              كل المسارات ←
            </Link>
          </div>
          <div className="flex flex-col gap-2.5 md:flex-row md:flex-wrap md:gap-4">
            {featured && (
              <Link
                href={`/paths/${featured.slug}`}
                className="flex gap-3 rounded-2xl border-2 border-primary bg-card p-4 text-foreground no-underline hover:text-foreground md:flex-[2_1_420px] md:flex-col md:p-[26px]"
              >
                <div className="flex shrink-0 items-center justify-between">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-white md:size-[52px] md:rounded-[14px]">
                    <PathIcon name={featured.icon} className="size-[22px] md:size-[26px]" />
                  </span>
                  <Badge tone="warning" className="hidden md:inline-flex">
                    المسار الأهم الآن
                  </Badge>
                </div>
                <div className="flex flex-1 flex-col gap-1 md:gap-3">
                  <p className="font-bold md:text-[22px]">{featured.title}</p>
                  <p className="hidden text-[15px] leading-[1.8] text-muted-foreground md:block">
                    <En>{featured.summary}</En>
                  </p>
                  {featured.levels && (
                    <div className="hidden flex-wrap gap-1.5 md:flex">
                      {featured.levels.map((l) => (
                        <Badge key={l}>
                          <En>{l}</En>
                        </Badge>
                      ))}
                      <Badge tone="warning">مسار الامتحان</Badge>
                    </div>
                  )}
                  <p className="text-[13px] text-muted-foreground md:mt-auto md:text-sm md:font-semibold md:text-primary">
                    {featured.duration} <span className="hidden md:inline">←</span>
                  </p>
                </div>
                <Badge tone="warning" className="md:hidden">
                  متاح
                </Badge>
              </Link>
            )}
            {others.map((p) => (
              <Link
                key={p.slug}
                href={`/paths/${p.slug}`}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 text-foreground no-underline hover:text-foreground md:flex-[1_1_240px] md:flex-col md:items-stretch md:gap-2.5 md:p-[22px]"
              >
                <div className="flex shrink-0 items-center justify-between">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-muted text-subtle md:size-11">
                    <PathIcon name={p.icon} className="size-5 md:size-[22px]" />
                  </span>
                  <Badge tone="muted" className="hidden md:inline-flex">
                    قريباً
                  </Badge>
                </div>
                <p className="flex-1 text-[15px] font-semibold md:flex-none md:text-[17px] md:font-bold">{p.title}</p>
                <p className="hidden text-sm leading-[1.7] text-muted-foreground md:block">{p.summary}</p>
                <p className="hidden text-[13px] text-muted-foreground md:mt-auto md:block">أبلغني عند الإطلاق</p>
                <Badge tone="muted" className="md:hidden">
                  قريباً
                </Badge>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Built for your conditions */}
      <section className="border-y border-border bg-card p-4 md:mx-auto md:flex md:max-w-[1200px] md:flex-col md:gap-6 md:border-0 md:bg-transparent md:px-6 md:py-16">
        <h2 className="text-[19px] font-bold md:text-[32px]">مصممة لظروفك</h2>
        <div className="flex flex-col md:flex-row md:flex-wrap md:gap-4">
          {features.map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="flex items-start gap-3 border-b border-muted py-3 last:border-b-0 md:flex-[1_1_240px] md:flex-col md:gap-2.5 md:rounded-2xl md:border md:border-border md:bg-card md:p-[22px] md:last:border-b"
            >
              <span className="text-primary md:flex md:size-12 md:items-center md:justify-center md:rounded-[14px] md:bg-primary-tint">
                <Icon className="size-[22px] md:size-6" aria-hidden="true" />
              </span>
              <div className="md:flex md:flex-col md:gap-2.5">
                <p className="font-semibold md:text-[17px] md:font-bold">{title}</p>
                <p className="text-[13px] leading-[1.7] text-muted-foreground md:text-sm md:leading-[1.8]">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How to start */}
      <section className="hidden bg-primary py-14 text-white md:block">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-8 px-6">
          <div className="flex flex-[1_1_420px] flex-col gap-2.5">
            <h2 className="text-[28px] font-bold">كيف تبدأ؟</h2>
            <p className="text-[17px] leading-[1.9] text-primary-tint">
              1. أنشئ حسابك (دقيقتان) · 2. أكمل بياناتك وهدفك · 3. اختبر مستواك (20 دقيقة) · 4. ابدأ جلسة اليوم
            </p>
          </div>
          <Button asChild variant="accent" size="lg">
            <Link href="/signup">أنشئ حسابك</Link>
          </Button>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-[860px] px-4 py-5 md:px-6 md:py-16">
        <h2 className="mb-2 text-[19px] font-bold md:text-[30px]">
          <span className="md:hidden">أسئلة شائعة</span>
          <span className="hidden md:inline">الأسئلة الشائعة</span>
        </h2>
        {faqs.map((f) => (
          <details key={f.q} className="border-b border-border py-3.5 md:py-[18px]">
            <summary className="text-[15px] font-semibold md:text-[17px]">{f.q}</summary>
            <p className="mt-2 text-sm leading-[1.8] text-muted-foreground md:mt-2.5 md:text-[15px] md:leading-[1.9]">{f.a}</p>
          </details>
        ))}
      </section>
    </main>
  );
}

function PreviewRow({ icon, badge, children }: { icon: React.ReactNode; badge?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 border-b border-muted py-3 text-sm last:border-b-0">
      {icon}
      <span className="flex-1">{children}</span>
      {badge}
    </div>
  );
}
