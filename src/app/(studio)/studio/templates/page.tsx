import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { requireStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { lessonTemplateSpec, PHASE_LABELS, unitTemplateSpec } from "@/lib/factory/templates";

export const metadata: Metadata = { title: "القوالب" };

export default async function TemplatesPage() {
  const { isAdmin } = await requireStaff();
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("content_templates")
    .select("kind, key, title_ar, description_ar, spec, version, updated_at")
    .order("kind")
    .order("key");
  const lessons = (rows ?? []).filter((r) => r.kind === "lesson");
  const units = (rows ?? []).filter((r) => r.kind === "unit");
  const titleOf = (key: string) => lessons.find((l) => l.key === key)?.title_ar ?? key;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">القوالب</h1>
        <p className="max-w-3xl text-muted-foreground">
          القالب يحدد أقسام الدرس وترتيبها ومن يملأ كل قسم. الوكيل والمعلم يملآن القالب ولا يخترعان شكلاً. تعديل القالب يطبَّق على ما يُبنى بعده، ولا يغيّر
          المنشور.
          {!isAdmin && " (التعديل للمدير.)"}
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">قوالب الوحدات</h2>
        {units.map((u) => {
          const spec = unitTemplateSpec.safeParse(u.spec);
          return (
            <Card key={u.key} className="flex flex-col gap-3 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">{u.title_ar}</h3>
                <Link href={`/studio/templates/unit/${u.key}`} className="text-sm font-semibold">
                  {isAdmin ? "عدّل ←" : "افتح ←"}
                </Link>
              </div>
              <p className="text-sm text-muted-foreground">{u.description_ar}</p>
              {spec.success && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {spec.data.lessons.map((l, i) => (
                    <Badge key={i} tone="primary">
                      {i + 1}. {titleOf(l.template)}
                    </Badge>
                  ))}
                  <Badge tone="ai">
                    اختبار {spec.data.quiz.min}–{spec.data.quiz.max} أسئلة · النجاح {spec.data.quiz.pass_percent}%
                  </Badge>
                </div>
              )}
            </Card>
          );
        })}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">قوالب الدروس</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {lessons.map((l) => {
            const spec = lessonTemplateSpec.safeParse(l.spec);
            return (
              <Card key={l.key} className="flex flex-col gap-3 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold">{l.title_ar}</h3>
                  <Link href={`/studio/templates/lesson/${l.key}`} className="text-sm font-semibold">
                    {isAdmin ? "عدّل ←" : "افتح ←"}
                  </Link>
                </div>
                <p className="text-sm text-muted-foreground">{l.description_ar}</p>
                {spec.success ? (
                  <ol className="flex flex-col gap-1 text-sm">
                    {spec.data.sections.map((s, i) => (
                      <li key={s.key}>
                        {i + 1}. <b>{s.title_ar}</b> <span className="text-muted-foreground">({PHASE_LABELS[s.phase]})</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <Badge tone="destructive">القالب غير صالح</Badge>
                )}
                <p className="text-xs text-muted-foreground">
                  النسخة {l.version} · {spec.success ? `${spec.data.est_minutes} دقيقة` : ""}
                </p>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
