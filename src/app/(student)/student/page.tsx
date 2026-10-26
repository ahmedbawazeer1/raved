import type { Metadata } from "next";
import Link from "next/link";
import { Bell, BookOpen } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SiteHeaderMinimal } from "@/components/site/site-header-minimal";
import { requireActiveStudent } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "اليوم" };

export default async function StudentHomePage() {
  const { profile, userId } = await requireActiveStudent();
  const supabase = await createClient();
  const [{ data: enrollment }, { data: notifications }] = await Promise.all([
    supabase.from("enrollments").select("paths(title, slug), levels(code, title)").eq("student_id", userId).eq("is_primary", true).maybeSingle(),
    supabase.from("notifications").select("id, title, body, created_at, read_at").eq("student_id", userId).order("created_at", { ascending: false }).limit(5),
  ]);
  const firstName = profile.full_name.split(" ")[0];

  return (
    <>
      <SiteHeaderMinimal
        action={
          <form action="/auth/signout" method="post">
            <Button type="submit" variant="secondary" size="sm">
              خروج
            </Button>
          </form>
        }
      />
      <main className="mx-auto flex w-full max-w-[640px] flex-col gap-4 px-4 py-6">
        <h1 className="text-2xl font-bold">أهلاً {firstName}، تم قبولك في رفد 🎉</h1>
        <Card className="flex items-start gap-3 p-5">
          <span className="flex size-11 flex-none items-center justify-center rounded-xl bg-primary text-white">
            <BookOpen className="size-5" aria-hidden="true" />
          </span>
          <div className="flex flex-col gap-1">
            <p className="font-bold">{enrollment?.paths?.title ?? "مسارك"}</p>
            {enrollment?.levels && (
              <p className="text-sm text-muted-foreground">
                تبدأ من المستوى <span className="font-en">{enrollment.levels.code}</span> · {enrollment.levels.title}
              </p>
            )}
            <p className="mt-1 text-sm leading-relaxed">الدروس وجلسة اليوم تُفتح قريباً. سنبلغك هنا عندما تجهز أول وحدة.</p>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-2 flex items-center gap-2 font-bold">
            <Bell className="size-5 text-primary" aria-hidden="true" /> الإشعارات
          </h2>
          {(notifications ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد إشعارات بعد.</p>
          ) : (
            notifications!.map((n) => (
              <div key={n.id} className="border-b border-muted py-3 last:border-b-0">
                <p className="font-semibold">{n.title}</p>
                {n.body && <p className="text-sm text-muted-foreground">{n.body}</p>}
              </div>
            ))
          )}
        </Card>
        <Link href="/paths" className="text-sm">
          تصفّح المسارات ←
        </Link>
      </main>
    </>
  );
}
