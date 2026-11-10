import Link from "next/link";
import { Award, Check, Download, Mic, PenLine } from "lucide-react";
import { ARENA_GAMES, GAME_INFO } from "@shared/arena/games";
import { RAFED_STAGES } from "@shared/art/rafed";
import { WORLDS, worldFor } from "@shared/art/river";
import { LEAGUE_TIERS } from "@shared/gamification/league";
import { GameIcon } from "@/components/arena/game-icon";
import { Rafed } from "@/components/art/rafed";
import { En } from "@/components/en";
import { HeroScene } from "@/components/landing/hero-scene";
import { Reveal } from "@/components/landing/reveal";
import { TryIt } from "@/components/landing/try-it";
import { TierBadge } from "@/components/league/tier-badge";
import { PathIcon } from "@/components/site/path-icon";
import { Button } from "@/components/ui/button";
import { getPublicPaths } from "@/lib/paths/queries";
import { cn } from "@/lib/utils";

const faqs = [
  {
    q: "هل رفد مجانية؟",
    a: "نعم بالكامل. لا اشتراك ولا إعلانات. رسوم الامتحان الدولي تدفعها لجهة الامتحان فقط عندما تقرر التقدم.",
  },
  {
    q: "أبدأ من الصفر في الإنجليزي، هل يناسبني؟",
    a: "نعم. اختبار تحديد المستوى يضعك في المكان المناسب، حتى لو كنت تعرف الحروف فقط.",
  },
  {
    q: "كم أحتاج من الوقت كل يوم؟",
    a: "من ١٥ إلى ٣٠ دقيقة تكفي. المهم أن تسقي رافد كل يوم، والجمعة يوم راحة لا يقطع سقايتك.",
  },
  {
    q: "هل تعطيني رفد شهادة IELTS؟",
    a: "لا. رفد تجهزك للامتحان، والشهادة الدولية تأخذها من جهة الامتحان. نعطيك شهادة إتمام داخلية لكل مستوى.",
  },
  {
    q: "من يرى اسمي في الدوري والساحة؟",
    a: "زملاؤك يرون اسمك الأول والحرف الأول من اسم عائلتك والأفتار فقط. وتستطيع الخروج من الدوري متى شئت.",
  },
  { q: "متى تُفتح المسارات الأخرى؟", a: "بعد استقرار مسار الإنجليزي. اضغط «أبلغني» على المسار الذي يهمك." },
];

const DAYS = ["س", "ح", "ن", "ث", "ر", "خ", "ج"];
const LADDER = ["A1", "A2", "B1", "B2", "IELTS"];
const press = "shadow-[0_5px_0_#C98210] active:translate-y-[5px] active:shadow-none";

export const revalidate = 300;

/** Two wave layers sliding slowly (pure CSS), used at the bottom of coloured bands. */
function Waves({ fill = "#fff", className }: { fill?: string; className?: string }) {
  return (
    <div className={cn("pointer-events-none absolute inset-x-0 bottom-0 h-16 overflow-hidden md:h-24", className)} aria-hidden="true">
      {[0.45, 1].map((o, i) => (
        <svg
          key={o}
          viewBox="0 0 2400 120"
          preserveAspectRatio="none"
          className="absolute bottom-0 h-full w-[200%] max-w-none motion-safe:animate-[wave-slide_linear_infinite]"
          style={{ animationDuration: `${18 + i * 10}s`, left: 0, opacity: o }}
        >
          <path
            d={
              i
                ? "M0 70 Q150 30 300 70 T600 70 T900 70 T1200 70 T1500 70 T1800 70 T2100 70 T2400 70 V120 H0Z"
                : "M0 50 Q150 95 300 50 T600 50 T900 50 T1200 50 T1500 50 T1800 50 T2100 50 T2400 50 V120 H0Z"
            }
            fill={fill}
          />
        </svg>
      ))}
    </div>
  );
}

function Tile({ children, className, delay }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <Reveal delay={delay} className={cn("flex flex-col gap-3 overflow-hidden rounded-[28px] border-2 border-border bg-card p-5 md:p-6", className)}>
      {children}
    </Reveal>
  );
}

export default async function HomePage() {
  const paths = await getPublicPaths();

  return (
    <main className="overflow-x-clip">
      {/* Hero */}
      <section className="relative bg-[linear-gradient(180deg,#F5F7F6_0%,#E3F2EE_55%,#C9F1FF_100%)] pb-20 md:pb-28">
        <div className="mx-auto grid max-w-[1200px] items-center gap-6 px-4 pt-8 md:grid-cols-2 md:gap-10 md:px-6 md:pt-14">
          <div className="flex flex-col items-center gap-5 text-center md:items-start md:text-start">
            <span className="rounded-full bg-white px-4 py-1.5 text-sm font-bold text-primary shadow-sm">مجانية بالكامل لطلاب الثانوية في اليمن</span>
            <h1 className="text-[34px] leading-[1.35] font-bold md:text-[56px] md:leading-[1.25]">
              تعلّم كل يوم قليلاً، <span className="text-primary">وشاهد نفسك تنمو</span>
            </h1>
            <p className="max-w-[520px] text-base leading-[1.9] text-muted-foreground md:text-[19px]">
              دروس قصيرة بشرح عربي، وألعاب وتحديات مع زملائك، ورفيقك «رافد» يكبر مع كل درس. أول مساراتنا:{" "}
              <b className="text-foreground">الإنجليزية من الصفر حتى الامتحان الدولي</b>.
            </p>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Button asChild variant="accent" size="lg" className={cn("min-h-14 px-10 text-lg", press)}>
                <Link href="/signup">ابدأ مجاناً</Link>
              </Button>
              <Button
                asChild
                variant="secondary"
                size="lg"
                className="min-h-14 border-2 shadow-[0_5px_0_var(--color-border)] active:translate-y-[5px] active:shadow-none"
              >
                <Link href="/login">عندي حساب</Link>
              </Button>
            </div>
            <ul className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-sm font-semibold text-subtle md:justify-start">
              {["بلا اشتراك", "بلا إعلانات", "شرح بالعربية"].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <Check className="size-4 text-primary" aria-hidden="true" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <HeroScene />
        </div>
        <Waves />
      </section>

      {/* Paths strip */}
      <section aria-label="المسارات" className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-center gap-2.5 px-4 py-5 md:gap-4 md:px-6">
          {paths.map((p) => (
            <Link
              key={p.id}
              href={`/paths/${p.slug}`}
              className={cn(
                "flex min-h-12 items-center gap-2 rounded-full border-2 px-4 font-bold no-underline transition-transform hover:-translate-y-0.5",
                p.status === "published"
                  ? "border-primary bg-primary-tint text-primary-hover hover:text-primary-hover"
                  : "border-border text-subtle hover:text-foreground",
              )}
            >
              <PathIcon name={p.icon} className="size-5" />
              {p.title}
              <span
                className={cn("rounded-full px-2 py-0.5 text-[11px]", p.status === "published" ? "bg-primary text-white" : "bg-muted text-muted-foreground")}
              >
                {p.status === "published" ? "متاح" : "قريباً"}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Try it */}
      <section className="mx-auto max-w-[900px] px-4 py-12 md:px-6 md:py-20">
        <Reveal className="mb-6 text-center">
          <h2 className="text-[26px] font-bold md:text-[40px]">جرّب تمريناً الآن</h2>
          <p className="mt-2 text-muted-foreground md:text-lg">بلا تسجيل. هكذا تكون تمارين رفد: قصيرة، وتصحيحها فوري.</p>
        </Reveal>
        <Reveal>
          <TryIt />
        </Reveal>
      </section>

      {/* Bento: what makes Raved */}
      <section className="bg-white py-12 md:py-20">
        <div className="mx-auto max-w-[1200px] px-4 md:px-6">
          <Reveal className="mb-8 text-center">
            <h2 className="text-[26px] font-bold md:text-[40px]">
              التعلّم هنا <span className="text-primary">ماء ونموّ</span>
            </h2>
            <p className="mt-2 text-muted-foreground md:text-lg">كل درس قطرة، وكل يوم سقاية، وكل مستوى عالم جديد.</p>
          </Reveal>
          <div className="grid gap-4 md:grid-cols-3">
            <Tile className="md:col-span-2">
              <h3 className="text-xl font-bold md:text-2xl">رحلة واضحة كالنهر</h3>
              <p className="text-muted-foreground">الدروس تُفتح واحداً بعد الآخر، وفي نهاية كل وحدة تواجه حارس السدّ. لكل مستوى عالم بألوانه.</p>
              <ol className="mt-auto grid grid-cols-5 gap-2 pt-3">
                {Object.values(WORLDS).map((w, i) => (
                  <li key={w.id} className="flex flex-col items-center gap-1.5 text-center text-xs font-bold md:text-sm">
                    <span className="relative flex h-20 w-full items-end overflow-hidden rounded-2xl md:h-28" style={{ background: w.sky }}>
                      <span className="absolute inset-x-0 bottom-0 h-1/2" style={{ background: w.land }} />
                      <span className="absolute inset-x-[30%] top-0 bottom-0" style={{ background: `linear-gradient(180deg, ${w.water2}, ${w.water})` }} />
                      <span className="absolute start-1.5 bottom-2 size-5 rounded-full md:size-7" style={{ background: w.tree }} />
                      <span className="absolute end-1.5 bottom-5 size-4 rounded-full md:size-6" style={{ background: w.tree2 }} />
                    </span>
                    <span style={{ color: w.band }}>{w.name}</span>
                    <span className="font-en text-[10px] text-muted-foreground md:text-xs">{["A1", "A2", "B1", "B2", "+"][i]}</span>
                  </li>
                ))}
              </ol>
            </Tile>

            <Tile delay={80} className="bg-[linear-gradient(180deg,#fff,#E3F2EE)]">
              <h3 className="text-xl font-bold md:text-2xl">رافد يكبر معك</h3>
              <p className="text-muted-foreground">رفيقك يبدأ بذرة، وينمو مرحلة مع كل مستوى تتمّه.</p>
              <div className="mt-auto flex items-end justify-between pt-2" aria-hidden="true">
                {RAFED_STAGES.map((s) => (
                  <span key={s.stage} className="flex flex-col items-center gap-1 text-[11px] font-bold text-primary-hover">
                    <Rafed size={34 + s.stage * 7} stage={s.stage} mood="happy" idle={s.stage === 5} />
                    {s.name}
                  </span>
                ))}
              </div>
            </Tile>

            <Tile>
              <h3 className="text-xl font-bold md:text-2xl">السقاية اليومية</h3>
              <p className="text-muted-foreground">درس واحد يكفي ليومك. والجمعة راحة لا تقطع سقايتك.</p>
              <ul className="mt-auto grid grid-cols-7 gap-1.5 pt-2" aria-label="مثال لأسبوع سقاية">
                {DAYS.map((d, i) => (
                  <li key={d} className="flex flex-col items-center gap-1 text-xs font-bold">
                    <span
                      className={cn(
                        "flex size-9 items-center justify-center rounded-full text-base md:size-10",
                        i < 4
                          ? "bg-[linear-gradient(180deg,#5CC8F0,#1C6FA3)] shadow-[inset_-2px_-3px_0_rgba(0,0,0,.15)]"
                          : i === 6
                            ? "bg-[#FFF4D6]"
                            : "bg-muted",
                      )}
                    >
                      {i < 4 ? "💧" : i === 6 ? "🌙" : ""}
                    </span>
                    {d}
                  </li>
                ))}
              </ul>
            </Tile>

            <Tile delay={80}>
              <h3 className="text-xl font-bold md:text-2xl">ساحة رفد</h3>
              <p className="text-muted-foreground">خمس ألعاب ضد خصم من مستواك، بكلمات دروسك أنت.</p>
              <ul className="mt-auto flex flex-wrap justify-between gap-2 pt-2">
                {ARENA_GAMES.map((g) => (
                  <li key={g} className="flex w-14 flex-col items-center gap-1 text-center text-[10px] leading-tight font-bold">
                    <GameIcon game={g} size={48} />
                    {GAME_INFO[g].name}
                  </li>
                ))}
              </ul>
            </Tile>

            <Tile delay={160} className="bg-[linear-gradient(180deg,#fff,#E5F4FC)]">
              <h3 className="text-xl font-bold md:text-2xl">الدوري المائي</h3>
              <p className="text-muted-foreground">مجموعة من ٢٠ طالباً كل أسبوع. أول ٥ يصعدون، والنتائج يوم الجمعة.</p>
              <ol className="mt-auto flex items-end justify-between pt-2">
                {LEAGUE_TIERS.map((t) => (
                  <li key={t.id} className="flex flex-col items-center text-[11px] font-bold">
                    <TierBadge tier={t.id} size={30 + t.id * 4} />
                    {t.name}
                  </li>
                ))}
              </ol>
            </Tile>

            <Tile className="bg-ai-tint md:col-span-2">
              <h3 className="text-xl font-bold md:text-2xl">تكلّم واكتب، والتصحيح فوري</h3>
              <p className="text-subtle">سجّل صوتك أو اكتب فقرة، وتحصل على ملاحظات بالعربية خلال ثوانٍ. الصوت لا يُحفظ أبداً.</p>
              <div className="mt-auto flex flex-col gap-2 pt-2 md:flex-row" aria-hidden="true">
                <div className="flex flex-1 items-start gap-2 rounded-2xl rounded-es-md bg-white p-3 text-sm shadow-sm">
                  <Mic className="mt-0.5 size-5 flex-none text-ai" />
                  <span dir="ltr" className="font-en">
                    I <s className="text-error">from</s> <b className="text-success">am from</b> Taiz.
                  </span>
                </div>
                <div className="flex flex-1 items-start gap-2 rounded-2xl rounded-es-md bg-white p-3 text-sm shadow-sm">
                  <PenLine className="mt-0.5 size-5 flex-none text-ai" />
                  <span>
                    نضع <En>am</En> بعد <En>I</En> قبل المكان. <span className="rounded bg-ai-tint px-1.5 text-xs font-bold text-ai">تقديري</span>
                  </span>
                </div>
              </div>
            </Tile>

            <Tile delay={80} className="bg-[#FFF8E8]">
              <Award className="size-10 text-accent" aria-hidden="true" />
              <h3 className="text-xl font-bold md:text-2xl">شهادة إتمام لكل مستوى</h3>
              <p className="text-subtle">برمز تحقق يستطيع أي أحد أن يتأكد منه.</p>
            </Tile>
          </div>
        </div>
      </section>

      {/* Ladder: zero → exam */}
      <section className="mx-auto max-w-[1200px] px-4 py-12 md:px-6 md:py-20">
        <Reveal className="mb-8 text-center">
          <h2 className="text-[26px] font-bold md:text-[40px]">من الصفر إلى الامتحان الدولي</h2>
          <p className="mt-2 text-muted-foreground md:text-lg">اختبار قصير يحدد مستواك، ثم تصعد درجة درجة.</p>
        </Reveal>
        <Reveal>
          <ol className="flex items-end gap-2 md:gap-4">
            {LADDER.map((code, i) => {
              const w = worldFor(code === "IELTS" ? "C1" : code);
              return (
                <li key={code} className="flex flex-1 flex-col items-center gap-2">
                  <span className="text-xs font-bold md:text-base" style={{ color: w.band }}>
                    {w.name}
                  </span>
                  <span
                    className="flex w-full items-start justify-center rounded-t-3xl pt-3 font-en text-sm font-bold text-white shadow-[inset_0_6px_0_rgba(255,255,255,.25)] md:pt-5 md:text-2xl"
                    style={{ height: 70 + i * 34, background: `linear-gradient(180deg, ${w.band}, ${w.water})` }}
                  >
                    {code}
                    {code === "IELTS" && <span className="hidden md:inline">&nbsp;· TOEFL</span>}
                  </span>
                </li>
              );
            })}
          </ol>
          <p className="mt-4 text-center text-sm text-muted-foreground">رفد تجهّزك للامتحان، والشهادة الدولية تأخذها من جهة الامتحان نفسها.</p>
        </Reveal>
      </section>

      {/* How to start */}
      <section className="bg-white py-12 md:py-20">
        <div className="mx-auto max-w-[1200px] px-4 md:px-6">
          <Reveal className="mb-8 text-center">
            <h2 className="text-[26px] font-bold md:text-[40px]">ثلاث خطوات وتبدأ</h2>
          </Reveal>
          <ol className="grid gap-4 md:grid-cols-3">
            {[
              { t: "أنشئ حسابك", d: "دقيقتان، بالبريد أو بحساب Google." },
              { t: "حدّد مستواك", d: "اختبار قصير يضعك في الوحدة المناسبة." },
              { t: "ابدأ درس اليوم", d: "درس قصير كل يوم، ورافد ينتظر سقايته." },
            ].map((s, i) => (
              <Reveal key={s.t} delay={i * 100}>
                <li className="flex h-full items-start gap-4 rounded-[28px] border-2 border-border p-5">
                  <span className="flex size-12 flex-none items-center justify-center rounded-2xl bg-primary font-en text-xl font-bold text-white shadow-[0_4px_0_#0A5446]">
                    {i + 1}
                  </span>
                  <span>
                    <b className="block text-lg">{s.t}</b>
                    <span className="text-muted-foreground">{s.d}</span>
                  </span>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* App */}
      <section className="mx-auto max-w-[1200px] px-4 py-12 md:px-6 md:py-16">
        <Reveal className="flex flex-col items-center gap-5 rounded-[32px] bg-[#12201D] p-6 text-center text-white md:flex-row md:justify-between md:p-10 md:text-start">
          <div>
            <h2 className="text-2xl font-bold md:text-3xl">رفد في جيبك</h2>
            <p className="mt-2 text-white/75">حمّل تطبيق أندرويد وادرس بنفس حسابك، مع تذكير يومي لطيف.</p>
          </div>
          <Button
            asChild
            size="lg"
            className="min-h-14 bg-white px-8 text-[#12201D] shadow-[0_5px_0_rgba(255,255,255,.35)] hover:bg-white hover:text-[#12201D] active:translate-y-[5px] active:shadow-none"
          >
            <Link href="/app">
              <Download className="size-5" aria-hidden="true" />
              حمّل تطبيق أندرويد
            </Link>
          </Button>
        </Reveal>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-[860px] px-4 pb-12 md:px-6 md:pb-20">
        <h2 className="mb-5 text-center text-[26px] font-bold md:text-[40px]">الأسئلة الشائعة</h2>
        <div className="flex flex-col gap-3">
          {faqs.map((f) => (
            <details key={f.q} className="group rounded-2xl border-2 border-border bg-card px-5 py-4 open:border-primary">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-base font-bold md:text-lg [&::-webkit-details-marker]:hidden">
                {f.q}
                <span
                  className="flex size-8 flex-none items-center justify-center rounded-full bg-primary-tint text-xl text-primary transition-transform group-open:rotate-45"
                  aria-hidden="true"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 leading-[1.9] text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden bg-[radial-gradient(120%_120%_at_80%_0%,#18A383_0%,#0E6E5C_50%,#08392F_100%)] pt-14 pb-28 text-center text-white md:pt-20 md:pb-36">
        <div className="mx-auto flex max-w-[720px] flex-col items-center gap-5 px-4">
          <Rafed size={130} stage={4} mood="happy" wave />
          <h2 className="text-[30px] leading-snug font-bold md:text-[48px]">رافد ينتظر أول قطرة منك</h2>
          <p className="text-lg text-white/80">ابدأ اليوم، ودرس واحد يكفي.</p>
          <Button asChild variant="accent" size="lg" className={cn("min-h-14 px-12 text-lg", press)}>
            <Link href="/signup">ابدأ مجاناً</Link>
          </Button>
        </div>
        <Waves fill="#F5F7F6" />
      </section>
    </main>
  );
}
