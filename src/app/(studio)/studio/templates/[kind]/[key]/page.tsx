import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eye } from "lucide-react";
import { PageHead, Panel } from "@/components/console/ui";
import { BlockFlow } from "@/components/studio/block-chip";
import { LessonTemplateEditor, UnitTemplateEditor } from "@/components/studio/template-editor";
import { requireStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_TEMPLATES, lessonTemplateSpec, unitTemplateSpec } from "@/lib/factory/templates";
import { resetTemplate } from "../../../actions";

export const metadata: Metadata = { title: "تعديل قالب" };

export default async function TemplatePage({ params }: PageProps<"/studio/templates/[kind]/[key]">) {
  const { kind, key } = await params;
  if (kind !== "lesson" && kind !== "unit") notFound();
  const { isAdmin } = await requireStaff();
  const supabase = await createClient();
  const { data: row } = await supabase.from("content_templates").select("*").eq("kind", kind).eq("key", key).maybeSingle();
  if (!row) notFound();
  const { data: lessonRows } = await supabase.from("content_templates").select("key, title_ar").eq("kind", "lesson").order("key");
  const isDefault = DEFAULT_TEMPLATES.some((t) => t.kind === kind && t.key === key);

  const lesson = kind === "lesson" ? lessonTemplateSpec.safeParse(row.spec) : null;
  const unit = kind === "unit" ? unitTemplateSpec.safeParse(row.spec) : null;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <PageHead
        crumbs={[{ label: "القوالب", href: "/studio/templates" }]}
        title={row.title_ar}
        sub={`النسخة ${row.version}. يطبَّق التعديل على الوحدات التي تُبنى بعد الحفظ فقط.`}
      />
      {lesson?.success && (
        <Panel title="شكل الدرس" icon={Eye}>
          <BlockFlow sections={lesson.data.sections} />
        </Panel>
      )}
      <Card className="rounded-[18px] p-5">
        {lesson?.success && (
          <LessonTemplateEditor templateKey={key} title={row.title_ar} description={row.description_ar} spec={lesson.data} readOnly={!isAdmin} />
        )}
        {unit?.success && (
          <UnitTemplateEditor
            templateKey={key}
            title={row.title_ar}
            description={row.description_ar}
            spec={unit.data}
            lessonTemplates={lessonRows ?? []}
            readOnly={!isAdmin}
          />
        )}
        {(lesson && !lesson.success) || (unit && !unit.success) ? <p className="text-destructive">القالب المحفوظ غير صالح. أعده للأصل.</p> : null}
      </Card>
      {isAdmin && isDefault && (
        <form action={resetTemplate}>
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="key" value={key} />
          <Button type="submit" variant="secondary" size="sm">
            أعد القالب كما كان في الأصل
          </Button>
        </form>
      )}
    </div>
  );
}
