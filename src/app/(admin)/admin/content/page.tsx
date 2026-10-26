import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { En } from "@/components/en";
import { ImportForm } from "@/components/admin/import-form";
import { createClient } from "@/lib/supabase/server";
import { listRepoUnitFiles } from "@/lib/content/repo";

export const metadata: Metadata = { title: "المحتوى" };

const STATUS = {
  published: { label: "منشورة", tone: "success" },
  review: { label: "بانتظار المراجعة", tone: "warning" },
  draft: { label: "مسودة", tone: "muted" },
} as const;

export default async function ContentPage() {
  const supabase = await createClient();
  const [{ data: units }, repoFiles] = await Promise.all([
    supabase
      .from("units")
      .select("id, code, title, status, version, package_size_bytes, levels(code, paths(title)), lessons(id, review_status, archived), vocab_items(id, archived)")
      .order("code"),
    listRepoUnitFiles(),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[28px] font-bold">استيراد ومراجعة الوحدات</h1>
        <p className="text-sm text-muted-foreground">الوحدات تُبنى بجلسات Claude Code كملفات JSON، ثم تُراجع هنا قبل النشر.</p>
      </div>
      <ImportForm repoFiles={repoFiles} />

      <section className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-[13px] text-muted-foreground">
              <th className="px-3 py-2.5 text-start font-semibold">الرمز</th>
              <th className="px-3 py-2.5 text-start font-semibold">الوحدة</th>
              <th className="px-3 py-2.5 text-start font-semibold">المحتوى</th>
              <th className="px-3 py-2.5 text-start font-semibold">المراجعة</th>
              <th className="px-3 py-2.5 text-start font-semibold">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {(units ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-5 text-muted-foreground">
                  لا توجد وحدات بعد. استورد أول وحدة من الأعلى.
                </td>
              </tr>
            )}
            {(units ?? []).map((u) => {
              const lessons = (u.lessons ?? []).filter((l) => !l.archived);
              const approved = lessons.filter((l) => l.review_status === "approved").length;
              const status = STATUS[u.status as keyof typeof STATUS] ?? STATUS.draft;
              return (
                <tr key={u.id} className="border-b border-muted last:border-b-0">
                  <td className="px-3 py-3">
                    <Link href={`/admin/content/${u.code}`} className="font-en font-semibold">
                      {u.code}
                    </Link>
                  </td>
                  <td className="px-3 py-3">
                    <En>{u.title}</En>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">
                    {lessons.length} دروس · {(u.vocab_items ?? []).filter((v) => !v.archived).length} كلمة · الإصدار {u.version}
                  </td>
                  <td className="px-3 py-3">
                    {approved}/{lessons.length} معتمد
                  </td>
                  <td className="px-3 py-3">
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
