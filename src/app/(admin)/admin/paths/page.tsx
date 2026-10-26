import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/form";
import { En } from "@/components/en";
import { PathIcon } from "@/components/site/path-icon";
import { PathForm, type PathFormValues } from "@/components/admin/path-form";
import { createClient } from "@/lib/supabase/server";
import { PATH_FEATURES, parseFeatures, pathStatusLabel } from "@/lib/paths/features";
import type { PathIcon as PathIconName } from "@/lib/paths/catalog";

export const metadata: Metadata = { title: "المسارات" };

const STATUS_TONE = { published: "success", soon: "warning", draft: "muted" } as const;

export default async function AdminPathsPage({ searchParams }: PageProps<"/admin/paths">) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: paths } = await supabase
    .from("paths")
    .select("*, levels(units(count)), path_waitlist(notified_at)")
    .order("position");

  const rows = (paths ?? []).map((p) => ({
    ...p,
    unitCount: (p.levels ?? []).reduce((sum, l) => sum + (l.units?.[0]?.count ?? 0), 0),
    waiting: (p.path_waitlist ?? []).filter((w) => !w.notified_at).length,
    featureFlags: parseFeatures(p.features),
  }));

  const editing = typeof sp.edit === "string" ? rows.find((p) => p.slug === sp.edit) : undefined;
  const creating = sp.new === "1";
  const formValues: PathFormValues | null = editing
    ? {
        id: editing.id,
        title: editing.title,
        slug: editing.slug,
        summary: editing.summary,
        description: editing.description,
        status: editing.status,
        position: editing.position,
        icon: editing.icon,
        est_months: editing.est_months,
        daily_minutes: editing.daily_minutes,
        features: editing.featureFlags,
      }
    : creating
      ? {
          title: "",
          slug: "",
          summary: "",
          description: "",
          status: "draft",
          position: rows.length + 1,
          icon: "book",
          est_months: null,
          daily_minutes: 25,
          features: parseFeatures({}),
        }
      : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold">المسارات</h1>
          <p className="text-sm text-muted-foreground">المسار الجديد = إنشاؤه هنا ثم استيراد وحداته. لا يحتاج كوداً.</p>
        </div>
        <Button asChild>
          <Link href="/admin/paths?new=1">مسار جديد</Link>
        </Button>
      </div>

      {sp.saved === "1" && (
        <Alert tone="success">
          حُفظ المسار.{sp.published === "1" && " أصبح منشوراً: أرسل إشعاراً لقائمة الانتظار من الأسفل."}
        </Alert>
      )}

      <section className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-start text-[13px] text-muted-foreground">
              <th className="px-3 py-2.5 text-start font-semibold">الترتيب</th>
              <th className="px-3 py-2.5 text-start font-semibold">المسار</th>
              <th className="px-3 py-2.5 text-start font-semibold">الحالة</th>
              <th className="px-3 py-2.5 text-start font-semibold">المحتوى</th>
              <th className="px-3 py-2.5 text-start font-semibold">الميزات المفعّلة</th>
              <th className="px-3 py-2.5 text-start font-semibold">قائمة الانتظار</th>
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-b border-muted last:border-b-0">
                <td className="px-3 py-3 font-en">{p.position}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2.5">
                    <PathIcon name={p.icon as PathIconName} className="size-5 text-primary" />
                    <div>
                      <p className="font-semibold">{p.title}</p>
                      <En as="p" className="text-xs text-muted-foreground">
                        /{p.slug}
                      </En>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <Badge tone={STATUS_TONE[p.status as keyof typeof STATUS_TONE] ?? "muted"}>{pathStatusLabel(p.status)}</Badge>
                </td>
                <td className="px-3 py-3 text-muted-foreground">{p.unitCount} وحدة</td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap gap-1">
                    {PATH_FEATURES.map((f) => (
                      <Badge key={f.key} tone={p.featureFlags[f.key] ? "primary" : "muted"} className={p.featureFlags[f.key] ? "" : "opacity-60"}>
                        {f.label}
                      </Badge>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-3">{p.waiting > 0 ? `${p.waiting} ينتظرون` : "—"}</td>
                <td className="px-3 py-3">
                  <Link href={`/admin/paths?edit=${p.slug}`} className="inline-flex min-h-11 items-center">
                    تعديل
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {formValues && (
        <section className="rounded-2xl border border-border bg-card p-5 md:p-6" aria-labelledby="path-form-title">
          <h2 id="path-form-title" className="mb-4 text-lg font-bold">
            {editing ? `تعديل: ${editing.title}` : "مسار جديد"}
          </h2>
          <PathForm key={formValues.id ?? "new"} path={formValues} waitlistCount={editing?.waiting ?? 0} />
        </section>
      )}
    </div>
  );
}
