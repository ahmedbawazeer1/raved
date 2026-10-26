import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock, Download, GraduationCap, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { En } from "@/components/en";
import { PathIcon } from "@/components/site/path-icon";
import { WaitlistForm } from "@/components/paths/waitlist-form";
import { getExams, getPublicPath, getPublicPaths, getPublishedUnits } from "@/lib/paths/queries";
import { getSessionContext } from "@/lib/auth/session";
import { formatBytes } from "@/lib/apply/compress";

export async function generateMetadata({ params }: PageProps<"/paths/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const path = await getPublicPath(slug);
  return path ? { title: path.title, description: path.summary } : { title: "المسار غير موجود" };
}

export default async function PathPage({ params }: PageProps<"/paths/[slug]">) {
  const { slug } = await params;
  const path = await getPublicPath(slug);
  if (!path) notFound();
  return path.status === "published" ? <PublishedPath slug={slug} /> : <SoonPath slug={slug} />;
}

/** Mixed Arabic text with Latin codes (e.g. "A1 إلى B2"): Latin runs rendered LTR. */
function MixedText({ text }: { text: string }) {
  const parts = text.split(/([A-Za-z][A-Za-z0-9+\-/ ]*[A-Za-z0-9+])/g);
  return (
    <>
      {parts.map((part, i) => (i % 2 === 1 ? <En key={i}>{part}</En> : part))}
    </>
  );
}

async function PublishedPath({ slug }: { slug: string }) {
  const path = (await getPublicPath(slug))!;
  const general = path.levels.filter((l) => l.kind === "general");
  const exam = path.levels.filter((l) => l.kind === "exam");
  const firstLevel = general[0];
  const [units, exams] = await Promise.all([
    firstLevel ? getPublishedUnits(firstLevel.id) : Promise.resolve([]),
    path.features.exam_track ? getExams() : Promise.resolve([]),
  ]);
  const totalUnits = general.reduce((sum, l) => sum + (l.planned_units ?? 0), 0);

  return (
    <main>
      <section className="bg-primary text-white">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-4 py-8 md:px-6 md:py-14">
          <Link href="/paths" className="hidden text-sm text-primary-tint hover:text-white md:inline">
            المسارات / {path.title.split(":")[0]}
          </Link>
          <h1 className="text-[26px] leading-snug font-bold md:text-[40px]">{path.title}</h1>
          <p className="max-w-2xl text-[15px] leading-[1.9] text-primary-tint md:text-lg">
            <MixedText text={path.description} />
          </p>
          <div className="hidden flex-wrap gap-5 text-sm text-primary-tint md:flex">
            <span className="flex items-center gap-2">
              <Clock className="size-4" aria-hidden="true" />
              {path.duration?.split("·")[1]?.trim() ?? "25 دقيقة يومياً"}
            </span>
            {totalUnits > 0 && (
              <span className="flex items-center gap-2">
                <Layers className="size-4" aria-hidden="true" />
                {totalUnits} وحدة
              </span>
            )}
            <span className="flex items-center gap-2">
              <Download className="size-4" aria-hidden="true" />
              كل وحدة قابلة للتنزيل
            </span>
          </div>
          <Button asChild variant="accent" size="lg" className="self-start">
            <Link href="/signup">ابدأ واختبر مستواك</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto flex max-w-[1200px] flex-col gap-4 px-4 py-7 md:px-6 md:py-12">
        <h2 className="text-xl font-bold md:text-[28px]">المستويات</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {general.map((l) => (
            <Card key={l.id} className="flex flex-col gap-1.5 p-5">
              <div className="flex items-center justify-between">
                <En className="text-2xl font-bold text-primary">{l.code}</En>
                {l.planned_units && <span className="text-sm text-muted-foreground">{l.planned_units} وحدة</span>}
              </div>
              <p className="font-bold">{l.title}</p>
              {l.description && <p className="text-sm text-muted-foreground">{l.description}</p>}
            </Card>
          ))}
          {exam.length > 0 && (
            <Card className="flex flex-col gap-1.5 border-accent p-5 sm:col-span-2 lg:col-span-4">
              <div className="flex items-center gap-2">
                <GraduationCap className="size-5 text-warning" aria-hidden="true" />
                <p className="font-bold">مسار الامتحان</p>
                <Badge tone="warning">
                  يُفتح عند <En>B1+</En>
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {exam.map((l, i) => (
                  <span key={l.id}>
                    {i > 0 && " · "}
                    <MixedText text={l.title} />
                  </span>
                ))}
              </p>
            </Card>
          )}
        </div>
      </section>

      <section className="mx-auto grid max-w-[1200px] gap-4 px-4 pb-8 md:grid-cols-[2fr_1fr] md:px-6 md:pb-14">
        <Card className="p-5">
          <h2 className="mb-2 text-lg font-bold">
            وحدات المستوى <En>{firstLevel?.code}</En>
          </h2>
          {units.length > 0 ? (
            units.map((u) => (
              <div key={u.code} className="flex items-center gap-3 border-b border-muted py-3 text-sm last:border-b-0">
                <En className="w-6 text-muted-foreground">{u.position}</En>
                <En className="flex-1 font-semibold">{u.title}</En>
                {u.package_size_bytes && <span className="text-muted-foreground">{formatBytes(u.package_size_bytes)}</span>}
              </div>
            ))
          ) : (
            <p className="py-2 text-sm text-muted-foreground">الوحدات قيد الإعداد وتُنشر قريباً.</p>
          )}
        </Card>
        <Card className="flex flex-col gap-2 p-5">
          <h2 className="text-lg font-bold">كل وحدة فيها</h2>
          <p className="text-sm leading-[1.9] text-muted-foreground">
            مفردات بنطقها · قاعدة بشرح عربي · استماع · قراءة · مهمة محادثة · مهمة كتابة · اختبار. والفيديو اختياري.
          </p>
        </Card>
      </section>

      {exams.length > 0 && (
        <section className="border-t border-border bg-card">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-4 py-8 md:px-6 md:py-12">
            <h2 className="text-xl font-bold md:text-[28px]">الامتحانات التي نجهزك لها من اليمن</h2>
            <div className="grid gap-3 md:grid-cols-3">
              {exams.map((e) => (
                <div key={e.code} className="rounded-2xl border border-border p-5">
                  <En as="p" className="text-lg font-bold">
                    {e.name}
                  </En>
                  <p className="mt-1 text-sm">
                    <MixedText text={e.locations} />
                  </p>
                  {e.summary && <p className="mt-1 text-sm text-muted-foreground">{e.summary}</p>}
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              اختر حسب ما تطلبه الجامعة أو المنحة. الرسوم وطرق الدفع تتغير، ونحدّثها في المنصة.
            </p>
          </div>
        </section>
      )}
    </main>
  );
}

async function SoonPath({ slug }: { slug: string }) {
  const [path, all, ctx] = await Promise.all([getPublicPath(slug), getPublicPaths(), getSessionContext()]);
  const p = path!;
  const featured = all.find((x) => x.status === "published");

  return (
    <main className="mx-auto flex max-w-[760px] flex-col gap-5 px-4 py-7 md:py-14">
      <Link href="/paths" className="hidden text-sm md:inline">
        المسارات / {p.title}
      </Link>
      <div className="flex items-center gap-3.5">
        <span className="flex size-14 flex-none items-center justify-center rounded-2xl bg-muted text-subtle">
          <PathIcon name={p.icon} className="size-7" />
        </span>
        <div>
          <Badge tone="muted">قريباً</Badge>
          <h1 className="mt-1 text-2xl font-bold md:text-[32px]">{p.title}</h1>
        </div>
      </div>
      <p className="text-[15px] leading-[1.9] text-muted-foreground md:text-[17px]">
        <MixedText text={p.description || p.summary} />
      </p>

      <Card className="flex flex-col gap-3 p-5">
        <p className="font-bold">أبلغني عند الإطلاق</p>
        <WaitlistForm pathId={p.id} signedIn={Boolean(ctx)} />
        {!ctx && (
          <p className="text-[13px] text-muted-foreground">
            لديك حساب؟ <Link href={`/login?next=/paths/${p.slug}`}>سجّل الدخول</Link> ونبلغك داخل المنصة.
          </p>
        )}
      </Card>

      {p.levels.length > 0 && (
        <Card className="p-5">
          <p className="mb-1 font-bold">ماذا سيحتوي (مبدئياً)</p>
          {p.levels.map((l, i) => (
            <div key={l.id} className="flex items-center gap-3 border-b border-muted py-3 text-sm last:border-b-0">
              <CheckCircle2 className="size-5 text-primary" aria-hidden="true" />
              <span>
                المستوى {i + 1}: <MixedText text={l.title} />
              </span>
            </div>
          ))}
        </Card>
      )}

      {featured && (
        <Link href={`/paths/${featured.slug}`}>في الأثناء: ابدأ مسار الإنجليزي، فهو مفيد لأي مسار تقني ←</Link>
      )}
    </main>
  );
}
