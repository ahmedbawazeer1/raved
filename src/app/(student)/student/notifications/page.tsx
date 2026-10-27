import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { requireActiveStudent } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { markAllNotificationsRead } from "../actions";

export const metadata: Metadata = { title: "الإشعارات" };

export default async function NotificationsPage() {
  const { userId } = await requireActiveStudent();
  const supabase = await createClient();
  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, title, body, link, created_at, read_at")
    .eq("student_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  const unread = (notifications ?? []).filter((n) => !n.read_at).length;

  return (
    <main className="mx-auto flex w-full max-w-[640px] flex-col gap-3 px-4 py-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">الإشعارات</h1>
        {unread > 0 && (
          <form action={markAllNotificationsRead}>
            <SubmitButton variant="secondary" size="sm" pendingLabel="…">
              تعليم الكل كمقروء
            </SubmitButton>
          </form>
        )}
      </div>
      {(notifications ?? []).length === 0 ? (
        <Card className="p-5 text-sm text-muted-foreground">لا توجد إشعارات بعد.</Card>
      ) : (
        <Card className="px-4 py-1">
          {notifications!.map((n) => {
            const body = (
              <>
                <span className="flex items-center gap-2">
                  {!n.read_at && <span className="size-2 flex-none rounded-full bg-accent" aria-label="جديد" />}
                  <span className={n.read_at ? "" : "font-semibold"}>{n.title}</span>
                </span>
                {n.body && <span className="block text-sm text-muted-foreground">{n.body}</span>}
                <span className="block text-xs text-muted-foreground">{new Date(n.created_at).toLocaleDateString("ar")}</span>
              </>
            );
            return n.link?.startsWith("/") ? (
              <Link key={n.id} href={n.link} className="block border-b border-muted py-3 text-foreground no-underline last:border-b-0 hover:text-foreground">
                {body}
              </Link>
            ) : (
              <div key={n.id} className="border-b border-muted py-3 last:border-b-0">
                {body}
              </div>
            );
          })}
        </Card>
      )}
    </main>
  );
}
