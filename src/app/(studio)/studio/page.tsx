import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { LANGUAGE_LABELS, parseProfile } from "@/lib/factory/profile";
import { MAP_STATUS } from "@/lib/factory/labels";

export const metadata: Metadata = { title: "المسارات والمناهج" };

const STEPS = [
  { n: 1, title: "المسار ومستوياته", text: "أنشئ المسار وأضف مستوياته، ولكل مستوى لغة فيديو وقالب." },
  { n: 2, title: "خريطة كل مستوى", text: "«عقل رفد» يخطط الوحدات بأهدافها وكلماتها. المعلم يراجع وأنت تعتمد." },
  { n: 3, title: "الوحدات واحدة واحدة", text: "المصنع يبني كل وحدة بفيديوهاتها وتمارينها. تراجعها وتنشرها." },
  { n: 4, title: "التحسين", text: "كل أسبوع تظهر الأسئلة والدروس التي تحتاج تحسيناً من نتائج الطلاب." },
];

interface Next {
  label: string;
  href: string;
}

export default async function StudioHome() {
  const { isAdmin } = await requireStaff();
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

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold">المسارات والمناهج</h1>
          <p className="max-w-2xl text-muted-foreground">هنا يُبنى كل مسار بنفس الخطوات. كل مسار يظهر معه «الخطوة التالية»: اضغطها لتكمل.</p>
        </div>
        {isAdmin && (
          <Button asChild>
            <Link href="/studio/paths/new" className="no-underline">
              <Plus className="size-4" aria-hidden="true" /> مسار جديد
            </Link>
          </Button>
        )}
      </header>

      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s) => (
          <li key={s.n} className="flex flex-col gap-1 rounded-2xl border border-border bg-card p-4">
            <span className="flex size-8 items-center justify-center rounded-full bg-primary-tint text-sm font-bold text-primary">{s.n}</span>
            <b>{s.title}</b>
            <span className="text-sm text-muted-foreground">{s.text}</span>
          </li>
        ))}
      </ol>

      {(paths ?? []).map((p) => {
        const profile = profileOf.get(p.id);
        const levels = [...(p.levels ?? [])].sort((a, b) => a.position - b.position);
        const next = nextStep({ slug: p.slug, levels });
        const published = levels.reduce((n, l) => n + unitsOf(l.id).filter((u) => u.build_status === "approved").length, 0);
        const approvedMaps = levels.filter((l) => mapOf.get(l.id)?.status === "approved").length;
        return (
          <Card key={p.id} className="flex flex-col gap-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold">{p.title}</h2>
                <Badge tone={p.status === "published" ? "success" : p.status === "soon" ? "warning" : "muted"}>
                  {p.status === "published" ? "ظاهر للطلاب" : p.status === "soon" ? "«قريباً» للطلاب" : "مخفي عن الطلاب"}
                </Badge>
              </div>
              <Link href={`/studio/paths/${p.slug}`} className="text-sm font-semibold">
                إعدادات المسار ومستوياته ←
              </Link>
            </div>
            <p className="text-sm text-muted-foreground tabular-nums">
              {levels.length} مستويات · {approvedMaps} خرائط معتمدة · {published} وحدة منشورة
            </p>
            {next ? (
              <Link
                href={next.href}
                className="flex min-h-12 items-center justify-between gap-2 rounded-xl bg-primary-tint px-4 font-semibold text-primary no-underline hover:bg-primary hover:text-white"
              >
                <span>الخطوة التالية: {next.label}</span>
                <span aria-hidden="true">←</span>
              </Link>
            ) : (
              <p className="rounded-xl bg-success-tint px-4 py-3 text-sm font-semibold text-success">كل وحدات هذا المسار منشورة.</p>
            )}
            {levels.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="py-2 text-start font-semibold">المستوى</th>
                      <th className="py-2 text-start font-semibold">لغة الفيديو</th>
                      <th className="py-2 text-start font-semibold">الخريطة</th>
                      <th className="py-2 text-start font-semibold">الوحدات المنشورة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {levels.map((l) => {
                      const m = mapOf.get(l.id);
                      const st = MAP_STATUS[m?.status ?? "none"];
                      const lp = profile?.levels.find((x) => x.code === l.code);
                      const us = unitsOf(l.id);
                      return (
                        <tr key={l.id} className="border-b border-border last:border-0">
                          <td className="py-3">
                            <Link href={`/studio/levels/${l.id}`} className="font-semibold">
                              <span dir="ltr">{l.code}</span> · {l.title}
                            </Link>
                          </td>
                          <td className="py-3">{lp ? LANGUAGE_LABELS[lp.video_language] : <span className="text-warning">لم تُضبط</span>}</td>
                          <td className="py-3">
                            <Badge tone={st.tone}>{st.label}</Badge>
                          </td>
                          <td className="py-3 tabular-nums">{us.length ? `${us.filter((u) => u.build_status === "approved").length} من ${us.length}` : "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
