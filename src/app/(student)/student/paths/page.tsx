import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MixedText } from "@/components/mixed-text";
import { WaitlistForm } from "@/components/paths/waitlist-form";
import { requireActiveStudent } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "مساراتي" };

export default async function MyPathsPage() {
  const { userId } = await requireActiveStudent();
  const supabase = await createClient();
  const [{ data: enrollments }, { data: soon }, { data: waiting }] = await Promise.all([
    supabase.from("enrollments").select("is_primary, paths(id, slug, title, summary), levels!enrollments_current_level_id_fkey(code)").eq("student_id", userId),
    supabase.from("paths").select("id, slug, title, summary").eq("status", "soon").order("position"),
    supabase.from("path_waitlist").select("path_id").eq("student_id", userId),
  ]);
  const notified = new Set((waiting ?? []).map((w) => w.path_id));

  return (
    <main className="mx-auto flex w-full max-w-[640px] flex-col gap-3 px-4 py-5">
      <h1 className="text-2xl font-bold">مساراتي</h1>
      {(enrollments ?? []).map((e) =>
        e.paths ? (
          <Link
            key={e.paths.id}
            href={`/student/${e.paths.slug}`}
            className="flex flex-col gap-1 rounded-2xl border border-border bg-card p-4 text-foreground no-underline hover:border-primary hover:text-foreground"
          >
            <span className="flex items-center gap-2">
              <span className="flex-1 font-bold">
                <MixedText text={e.paths.title} />
              </span>
              {e.is_primary && <Badge>الأساسي</Badge>}
            </span>
            <span className="text-sm text-muted-foreground">
              {e.levels?.code ? `مستواك الحالي: ${e.levels.code}` : <MixedText text={e.paths.summary} />}
            </span>
          </Link>
        ) : null,
      )}
      {(soon ?? []).length > 0 && <h2 className="mt-3 font-bold">قريباً</h2>}
      {(soon ?? []).map((p) => (
        <Card key={p.id} className="flex flex-col gap-2 p-4">
          <p className="font-semibold">
            <MixedText text={p.title} />
          </p>
          <p className="text-sm text-muted-foreground">
            <MixedText text={p.summary} />
          </p>
          {notified.has(p.id) ? <Badge tone="success">سنبلغك عند الإطلاق</Badge> : <WaitlistForm pathId={p.id} signedIn />}
        </Card>
      ))}
    </main>
  );
}
