import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { requireStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { LANGUAGE_LABELS, parseProfile } from "@/lib/factory/profile";
import { MAP_STATUS } from "@/lib/factory/labels";

export const metadata: Metadata = { title: "المسارات والمناهج" };

export default async function StudioHome() {
  const { isAdmin } = await requireStaff();
  const supabase = await createClient();
  const [{ data: paths }, { data: profiles }, { data: maps }, { data: plannedUnits }] = await Promise.all([
    supabase.from("paths").select("id, slug, title, status, position, levels(id, code, title, position, kind)").order("position"),
    supabase.from("path_profiles").select("path_id, profile"),
    supabase.from("curriculum_levels").select("level_id, status, teacher_ok_at"),
    supabase.from("curriculum_units").select("level_id, build_status"),
  ]);
  const profileOf = new Map((profiles ?? []).map((p) => [p.path_id, parseProfile(p.profile)]));
  const mapOf = new Map((maps ?? []).map((m) => [m.level_id, m]));
  const unitsOf = (levelId: string) => (plannedUnits ?? []).filter((u) => u.level_id === levelId);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">المسارات والمناهج</h1>
        <p className="max-w-3xl text-muted-foreground">
          المصنع يبني كل مسار بنفس الخطوات: ملف المسار ← خريطة كل مستوى (تراجعها ثم تُعتمد) ← الوحدات واحدة واحدة. ما يميز المسار يُضبط في ملفه، لا في الكود.
        </p>
      </header>

      {(paths ?? []).map((p) => {
        const profile = profileOf.get(p.id);
        const levels = [...(p.levels ?? [])].sort((a, b) => a.position - b.position);
        return (
          <Card key={p.id} className="flex flex-col gap-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold">{p.title}</h2>
                {!profile && <Badge tone="muted">بلا ملف مسار</Badge>}
              </div>
              <Link href={`/studio/paths/${p.slug}`} className="text-sm font-semibold">
                {isAdmin ? "ملف المسار ومصادر الفيديو ←" : "مصادر الفيديو والإعدادات ←"}
              </Link>
            </div>
            {levels.length === 0 ? (
              <p className="text-muted-foreground">لا توجد مستويات بعد. خطط المسار من «عقل رفد» أولاً.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-start text-muted-foreground">
                      <th className="py-2 text-start font-semibold">المستوى</th>
                      <th className="py-2 text-start font-semibold">لغة الفيديو</th>
                      <th className="py-2 text-start font-semibold">الخريطة</th>
                      <th className="py-2 text-start font-semibold">الوحدات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {levels.map((l) => {
                      const m = mapOf.get(l.id);
                      const st = MAP_STATUS[m?.status ?? "none"];
                      const lp = profile?.levels.find((x) => x.code === l.code);
                      const us = unitsOf(l.id);
                      const built = us.filter((u) => u.build_status === "approved").length;
                      return (
                        <tr key={l.id} className="border-b border-border last:border-0">
                          <td className="py-3">
                            <Link href={`/studio/levels/${l.id}`} className="font-semibold">
                              <span dir="ltr">{l.code}</span> · {l.title}
                            </Link>
                          </td>
                          <td className="py-3">{lp ? LANGUAGE_LABELS[lp.video_language] : "—"}</td>
                          <td className="py-3">
                            <Badge tone={st.tone}>{st.label}</Badge>
                            {m?.status === "review" && m.teacher_ok_at && <span className="ms-2 text-xs text-success">راجعها المعلم</span>}
                          </td>
                          <td className="py-3 tabular-nums">{us.length ? `${built} من ${us.length} منشورة` : "—"}</td>
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
