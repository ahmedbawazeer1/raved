import type { Metadata } from "next";
import Link from "next/link";
import { Award, Bell, ChevronLeft, Download, LineChart, Route } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ExperienceForm } from "@/components/student/experience-form";
import { FeedbackForm } from "@/components/student/feedback-form";
import { DeleteAccountForm, PasswordForm, ProfileForm, StudyForm } from "@/components/student/settings-forms";
import { requireActiveStudent } from "@/lib/auth/session";
import { gradeLabel } from "@/lib/yemen";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "حسابي" };

const LINKS = [
  { href: "/student/progress", label: "التقدم والامتحان", icon: LineChart },
  { href: "/student/paths", label: "مساراتي", icon: Route },
  { href: "/student/certificates", label: "شهاداتي", icon: Award },
  { href: "/student/notifications", label: "الإشعارات", icon: Bell },
];

export default async function SettingsPage() {
  const { profile, userId } = await requireActiveStudent();
  const supabase = await createClient();
  const [{ data: governorates }, { count: unread }, { data: passed }] = await Promise.all([
    supabase.from("governorates").select("code, name_ar").order("position"),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("student_id", userId).is("read_at", null),
    supabase.from("quiz_attempts").select("quiz_id, quizzes!inner(kind)").eq("student_id", userId).eq("passed", true),
  ]);
  const passedOf = (kind: string) => new Set((passed ?? []).filter((p) => p.quizzes?.kind === kind).map((p) => p.quiz_id)).size;
  const progress = { unitsPassed: passedOf("unit"), levelsDone: passedOf("level_end"), gamesWon: 0, bestWatering: 0, champion: false, pathDone: false };
  const governorate = governorates?.find((g) => g.code === profile.governorate)?.name_ar;

  return (
    <main className="mx-auto flex w-full max-w-[640px] flex-col gap-4 px-4 py-5">
      <header className="flex items-center gap-3">
        <span className="flex size-14 items-center justify-center rounded-full bg-primary-tint text-xl font-bold text-primary-hover">
          {profile.full_name.trim().charAt(0)}
        </span>
        <div>
          <h1 className="text-xl font-bold">{profile.full_name}</h1>
          <p className="text-sm text-muted-foreground">{[gradeLabel(profile.grade), governorate].filter((v) => v && v !== "—").join(" · ")}</p>
        </div>
      </header>

      <Card className="px-4 py-1">
        {LINKS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex min-h-12 items-center gap-3 border-b border-muted py-2 text-foreground no-underline last:border-b-0 hover:text-foreground"
          >
            <Icon className="size-5 text-primary" aria-hidden="true" />
            <span className="flex-1">{label}</span>
            {href === "/student/notifications" && Boolean(unread) && (
              <span className="rounded-full bg-accent px-2 text-xs leading-5 font-bold text-accent-foreground">{unread}</span>
            )}
            <ChevronLeft className="size-4 text-muted-foreground" aria-hidden="true" />
          </Link>
        ))}
      </Card>

      <Card id="feedback" className="p-5">
        <FeedbackForm />
      </Card>

      <ExperienceForm progress={progress} savedAvatar={profile.avatar != null} />

      <Card className="p-5">
        <h2 className="mb-3 font-bold">دراستي</h2>
        <StudyForm minutes={profile.daily_goal_minutes} dataSaver={profile.data_saver} />
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 font-bold">بياناتي</h2>
        <p className="mb-3 font-en text-sm text-muted-foreground" dir="ltr">
          {profile.email}
        </p>
        <ProfileForm initial={profile} governorates={governorates ?? []} />
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 font-bold">كلمة المرور</h2>
        <PasswordForm />
      </Card>

      <Card className="flex flex-col gap-3 p-5">
        <h2 className="font-bold">الخصوصية</h2>
        <p className="text-sm text-muted-foreground">
          اقرأ <Link href="/privacy">سياسة الخصوصية</Link> و<Link href="/terms">الشروط</Link>.
        </p>
        <Button asChild variant="secondary" className="self-start">
          <a href="/student/settings/export" download>
            <Download className="size-4" aria-hidden="true" />
            تنزيل بياناتي
          </a>
        </Button>
      </Card>

      <Card className="border-[#F4C7C3] p-5">
        <h2 className="mb-2 font-bold text-destructive">حذف الحساب</h2>
        <DeleteAccountForm />
      </Card>

      <form action="/auth/signout" method="post">
        <Button type="submit" variant="secondary" className="w-full">
          تسجيل الخروج
        </Button>
      </form>
    </main>
  );
}
