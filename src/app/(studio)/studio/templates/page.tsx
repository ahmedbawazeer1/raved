import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, LayoutTemplate, Swords } from "lucide-react";
import { IconTile, PageHead } from "@/components/console/ui";
import { BlockFlow } from "@/components/studio/block-chip";
import { Badge } from "@/components/ui/badge";
import { requireStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { lessonTemplateSpec, unitTemplateSpec } from "@/lib/factory/templates";

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
    <div className="flex flex-col gap-5">
      <PageHead
        title="القوالب"
        sub={`القالب يحدد أقسام الدرس وترتيبها ومن يملأ كل قسم. التعديل يطبَّق على ما يُبنى بعده، ولا يغيّر المنشور.${isAdmin ? "" : " (التعديل للمدير.)"}`}
      />

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-bold">قوالب الدروس</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {lessons.map((l) => {
            const spec = lessonTemplateSpec.safeParse(l.spec);
            return (
              <article key={l.key} className="flex flex-col gap-3 rounded-[18px] border border-border bg-card p-4">
                <div className="flex items-center gap-3">
                  <IconTile icon={LayoutTemplate} tone="ai" />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold">{l.title_ar}</h3>
                    <p className="text-xs text-muted-foreground">
                      النسخة {l.version}
                      {spec.success ? ` · ${spec.data.est_minutes} دقيقة` : ""}
                    </p>
                  </div>
                  <Link href={`/studio/templates/lesson/${l.key}`} className="flex min-h-10 items-center gap-1 rounded-xl px-2 text-sm font-semibold">
                    {isAdmin ? "عدّل" : "افتح"} <ArrowLeft className="size-4" aria-hidden="true" />
                  </Link>
                </div>
                {l.description_ar && <p className="text-sm text-muted-foreground">{l.description_ar}</p>}
                {spec.success ? <BlockFlow sections={spec.data.sections} /> : <Badge tone="destructive">القالب غير صالح</Badge>}
              </article>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-bold">قوالب الوحدات</h2>
        {units.map((u) => {
          const spec = unitTemplateSpec.safeParse(u.spec);
          return (
            <article key={u.key} className="flex flex-col gap-3 rounded-[18px] border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <IconTile icon={LayoutTemplate} tone="green" />
                <h3 className="min-w-0 flex-1 font-bold">{u.title_ar}</h3>
                <Link href={`/studio/templates/unit/${u.key}`} className="flex min-h-10 items-center gap-1 rounded-xl px-2 text-sm font-semibold">
                  {isAdmin ? "عدّل" : "افتح"} <ArrowLeft className="size-4" aria-hidden="true" />
                </Link>
              </div>
              {u.description_ar && <p className="text-sm text-muted-foreground">{u.description_ar}</p>}
              {spec.success && (
                <ol className="flex flex-wrap items-center gap-1.5">
                  {spec.data.lessons.map((l, i) => (
                    <li key={i}>
                      <Badge tone="primary">
                        {i + 1}. {titleOf(l.template)}
                      </Badge>
                    </li>
                  ))}
                  <li>
                    <Badge tone="ai">
                      <Swords className="size-3.5" aria-hidden="true" /> اختبار {spec.data.quiz.min}–{spec.data.quiz.max} أسئلة · النجاح{" "}
                      {spec.data.quiz.pass_percent}%
                    </Badge>
                  </li>
                </ol>
              )}
            </article>
          );
        })}
      </section>
    </div>
  );
}
