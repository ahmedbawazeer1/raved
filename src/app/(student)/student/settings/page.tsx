import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireActiveStudent } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "حسابي" };

export default async function SettingsPage() {
  const { profile, userId } = await requireActiveStudent();
  const supabase = await createClient();
  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, title, body, created_at, read_at")
    .eq("student_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <main className="mx-auto flex w-full max-w-[640px] flex-col gap-4 px-4 py-5">
      <h1 className="text-2xl font-bold">حسابي</h1>
      <Card className="flex flex-col gap-1 p-5">
        <p className="font-bold">{profile.full_name}</p>
        <p className="font-en text-sm text-muted-foreground" dir="ltr">
          {profile.email}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">بقية الإعدادات (الهدف، توفير الباقة، تنزيل بياناتك، حذف الحساب) تأتي قريباً.</p>
      </Card>
      <Card id="notifications" className="p-5">
        <h2 className="mb-2 font-bold">الإشعارات</h2>
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
      <form action="/auth/signout" method="post">
        <Button type="submit" variant="secondary" className="w-full">
          تسجيل الخروج
        </Button>
      </form>
    </main>
  );
}
