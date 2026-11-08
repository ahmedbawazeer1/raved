import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Check, Code2, Eye, EyeOff, Languages, LayoutTemplate, LineChart, Plus, Sparkles, MonitorPlay } from "lucide-react";
import { IconTile, PageHead } from "@/components/console/ui";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { requireStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { parseProfile } from "@/lib/factory/profile";

export const metadata: Metadata = { title: "المسارات والمناهج" };

const STEPS = [
  { n: 1, title: "ملف المسار", text: "المستويات، لغة الفيديو، القوالب" },
  { n: 2, title: "خريطة كل مستوى", text: "يرسمها «عقل رفد» وتعتمدها" },
  { n: 3, title: "الوحدات بالترتيب", text: "يبنيها المصنع وتراجعها" },
  { n: 4, title: "التحسين الأسبوعي", text: "من نتائج الطلاب" },
];
const COVERS = ["from-[#0E6E5C] via-[#13866f] to-[#c98a1d]", "from-[#1D63C9] to-[#6941C6]", "from-[#8A5A00] to-[#B42318]", "from-[#087443] to-[#1D63C9]"];

interface Next {
  label: string;
  href: string;
}

export default async function StudioHome({ searchParams }: PageProps<"/studio">) {
  const { isAdmin } = await requireStaff();
  const deleted = (await searchParams).deleted === "1";
  const supabase = await createClient();
  const [{ data: paths }, { data: profiles }, { data: maps }, { data: units }] = await Promise.all([
    supabase.from("paths").select("id, slug, title, status, position, levels(id, code, title, position)").order("position"),
    supabase.from("path_profiles").select("path_id, profile"),
    supabase.from("curriculum_levels").select("level_id, status, teacher_ok_at"),
    supabase.from("curriculum_units").select("id, level_id, code, position, build_status"),
  ]);
  const profileOf = new Map((profiles ?? []).map((p) => [p.path_id, parseProfile(p.profile)]));
  const mapOf = new Map((maps ?? []).map((m) => [m.level_id, m]));
  const unitsOf = (levelId: string) => (units ?? []).filter((u) => u.level_id === levelId).sort((a, b) => a.position - b.position);

  /** The one thing to do next on a path, in the factory's order. */
  function nextStep(p: { slug: string; levels: { id: string; code: string; position: number }[] }): Next | null {
    const levels = [...p.levels].sort((a, b) => a.position - b.position);
    if (!levels.length) return { label: "أضف مستويات المسار", href: `/studio/paths/${p.slug}#levels` };
    for (const l of levels) {
      const m = mapOf.get(l.id);
      const us = unitsOf(l.id);
      const review = us.find((u) => u.build_status === "review");
      if (review) return { label: `راجع الوحدة ${review.code}`, href: `/studio/units/${review.id}` };
      const building = us.find((u) => u.build_status === "building");
      if (building) return { label: `المصنع يبني ${building.code}… (افتحها)`, href: `/studio/units/${building.id}` };
      if (!m || m.status === "draft") return { label: `خطط خريطة المستوى ${l.code}`, href: `/studio/levels/${l.id}` };
      if (m.status === "planning") return { label: `الوكيل يخطط ${l.code}…`, href: `/studio/levels/${l.id}` };
      if (m.status === "review") return { label: `راجع خريطة ${l.code} واعتمدها`, href: `/studio/levels/${l.id}` };
      if (us.some((u) => u.build_status !== "approved")) return { label: `ابنِ الوحدة التالية في ${l.code}`, href: `/studio/levels/${l.id}` };
    }
    return null;
  }

  const totalPub = (paths ?? []).reduce(
    (n, p) => n + (p.levels ?? []).reduce((m, l) => m + unitsOf(l.id).filter((u) => u.build_status === "approved").length, 0),
    0,
  );
  const anyMap = (maps ?? []).some((m) => m.status !== "draft");
  const stage = totalPub > 0 ? 4 : anyMap ? 3 : (paths ?? []).length ? 2 : 1;

  return (
    <div className="flex flex-col gap-5">
      <PageHead title="الاستوديو" sub="كل مسار بطاقة: تقدّمه، مستوياته، والخطوة التالية.">
        {isAdmin && (
          <Button asChild>
            <Link href="/studio/paths/new" className="no-underline">
              <Plus className="size-4" aria-hidden="true" /> مسار جديد
            </Link>
          </Button>
        )}
      </PageHead>

      {deleted && <p className="rounded-xl bg-success-tint px-4 py-3 text-sm font-semibold text-success">حُذف المسار.</p>}

      <ol className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {STEPS.map((st) => {
          const done = st.n < stage;
          const now = st.n === stage;
          return (
            <li
              key={st.n}
              className={cn(
                "flex items-center gap-2.5 rounded-2xl border bg-card p-3",
                now ? "border-accent shadow-[0_0_0_3px_var(--color-warning-tint)]" : "border-border",
              )}
            >
              <span
                className={cn(
                  "flex size-8 flex-none items-center justify-center rounded-xl font-en text-sm font-bold",
                  done ? "bg-success-tint text-success" : now ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground",
                )}
              >
                {done ? <Check className="size-4" aria-hidden="true" /> : st.n}
              </span>
              <span className="min-w-0">
                <b className="block text-sm">{st.title}</b>
                <span className="text-xs text-muted-foreground">{st.text}</span>
              </span>
            </li>
          );
        })}
      </ol>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(paths ?? []).map((p, idx) => {
          const profile = profileOf.get(p.id);
          const levels = [...(p.levels ?? [])].sort((a, b) => a.position - b.position);
          const next = nextStep({ slug: p.slug, levels });
          const all = levels.flatMap((l) => unitsOf(l.id));
          const published = all.filter((u) => u.build_status === "approved").length;
          const pct = all.length ? Math.round((published / all.length) * 100) : 0;
          const approvedMaps = levels.filter((l) => mapOf.get(l.id)?.status === "approved").length;
          const english = p.slug === "english";
          return (
            <article
              key={p.id}
              className="flex flex-col overflow-hidden rounded-[18px] border border-border bg-card shadow-[0_1px_2px_rgba(18,32,29,.05),0_6px_18px_-8px_rgba(18,32,29,.12)]"
            >
              <div className={cn("flex h-24 items-start justify-between bg-gradient-to-l p-4 text-white", COVERS[idx % COVERS.length])}>
                <span className="flex size-11 items-center justify-center rounded-2xl bg-white/20">
                  {english ? <Languages className="size-6" aria-hidden="true" /> : <Code2 className="size-6" aria-hidden="true" />}
                </span>
                <span
                  className="flex size-12 items-center justify-center rounded-full"
                  style={{ background: `conic-gradient(#fff ${pct}%, rgba(255,255,255,.28) 0)` }}
                  role="img"
                  aria-label={`${pct}% من الوحدات منشورة`}
                >
                  <span className="flex size-[38px] items-center justify-center rounded-full bg-black/20 font-en text-xs font-bold">{pct}%</span>
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-3 p-4">
                <div>
                  <h2 className="text-[17px] font-bold">{p.title}</h2>
                  <span
                    className={cn(
                      "mt-1.5 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[13px] font-semibold",
                      p.status === "published"
                        ? "bg-success-tint text-success"
                        : p.status === "soon"
                          ? "bg-warning-tint text-warning"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    {p.status === "published" ? <Eye className="size-3.5" aria-hidden="true" /> : <EyeOff className="size-3.5" aria-hidden="true" />}
                    {p.status === "published" ? "ظاهر للطلاب" : p.status === "soon" ? "«قريباً» للطلاب" : "مسودة · مخفي عن الطلاب"}
                  </span>
                </div>
                {levels.length > 0 && (
                  <ul className="flex flex-wrap gap-1.5" aria-label="المستويات">
                    {levels.map((l) => {
                      const m = mapOf.get(l.id);
                      const us = unitsOf(l.id);
                      const dot =
                        us.length && us.every((u) => u.build_status === "approved")
                          ? "bg-success"
                          : m?.status === "approved"
                            ? "bg-accent"
                            : m?.status === "review" || m?.status === "planning"
                              ? "bg-ai"
                              : "bg-border";
                      return (
                        <li key={l.id}>
                          <Link
                            href={`/studio/levels/${l.id}`}
                            className="inline-flex min-h-8 items-center gap-1.5 rounded-xl border border-border px-2.5 text-[13px] font-semibold text-foreground no-underline hover:border-primary hover:text-foreground"
                          >
                            <span className={cn("size-2 rounded-full", dot)} aria-hidden="true" />
                            <span dir="ltr">{l.code}</span>
                            {profile?.levels.find((x) => x.code === l.code)?.video_language === "ar" ? (
                              <span className="text-[11px] text-muted-foreground">عربي</span>
                            ) : null}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <p className="text-[13px] text-muted-foreground">
                  {levels.length} مستويات · {approvedMaps} خرائط معتمدة · {published} من {all.length || "—"} وحدة منشورة
                </p>
                <div className="mt-auto flex flex-col gap-2">
                  {next ? (
                    <Link
                      href={next.href}
                      className="flex min-h-12 items-center gap-2 rounded-xl bg-primary-tint px-3 font-bold text-primary no-underline hover:bg-primary hover:text-white"
                    >
                      <Sparkles className="size-4 flex-none" aria-hidden="true" />
                      <span className="flex-1">{next.label}</span>
                      <ArrowLeft className="size-4" aria-hidden="true" />
                    </Link>
                  ) : (
                    <p className="rounded-xl bg-success-tint px-3 py-3 text-sm font-semibold text-success">كل وحدات هذا المسار منشورة.</p>
                  )}
                  <Link href={`/studio/paths/${p.slug}`} className="text-sm font-semibold">
                    ملف المسار ومستوياته ←
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
        {isAdmin && (
          <Link
            href="/studio/paths/new"
            className="flex min-h-[260px] flex-col items-center justify-center gap-2 rounded-[18px] border-2 border-dashed border-border bg-card p-6 text-center text-foreground no-underline hover:border-primary hover:text-foreground"
          >
            <IconTile icon={Plus} tone="green" size="lg" />
            <b>مسار جديد</b>
            <span className="max-w-[240px] text-sm text-muted-foreground">
              تحليل البيانات؟ التصميم الرقمي؟ أضف المسار ومستوياته، ثم يرسم «عقل رفد» الخرائط.
            </span>
          </Link>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {[
          { href: "/studio/templates", icon: LayoutTemplate, tone: "ai" as const, title: "قوالب الدروس", sub: "ترتيب أقسام كل درس" },
          {
            href: "/studio/paths/english#sources",
            icon: MonitorPlay,
            tone: "red" as const,
            title: "مصادر الفيديو الموثوقة",
            sub: "قوائم وقنوات يبحث فيها المصنع أولاً",
          },
          { href: "/studio/insights", icon: LineChart, tone: "gold" as const, title: "نتائج الوحدات والتحسين", sub: "من نتائج الطلاب كل أسبوع" },
        ].map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="flex items-center gap-3 rounded-[18px] border border-border bg-card p-4 text-foreground no-underline hover:border-primary hover:text-foreground"
          >
            <IconTile icon={c.icon} tone={c.tone} />
            <span>
              <b className="block">{c.title}</b>
              <span className="text-[13px] text-muted-foreground">{c.sub}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
