import type { Metadata } from "next";
import Link from "next/link";
import { Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { En } from "@/components/en";
import { MixedText } from "@/components/mixed-text";
import { CopyButton } from "@/components/student/copy-button";
import { ProgressBar } from "@/components/student/progress-bar";
import { requireActiveStudent } from "@/lib/auth/session";
import { getOrigin } from "@/lib/site-url";
import { getCurriculum, getPrimaryPath } from "@/lib/student/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "شهاداتي" };

export default async function CertificatesPage() {
  const { userId, profile } = await requireActiveStudent();
  const supabase = await createClient();
  // Issues any certificate the student has earned since the last visit (checked in the database).
  await supabase.rpc("claim_certificates");
  const [{ data: certificates }, path, origin] = await Promise.all([
    supabase.from("certificates").select("code, issued_at, levels(code, title, position), paths(title)").eq("student_id", userId).order("issued_at"),
    getPrimaryPath(userId),
    getOrigin(),
  ]);
  const curriculum = path ? await getCurriculum(userId, path.id) : null;
  const earned = new Set((certificates ?? []).map((c) => c.levels?.code));
  const next = curriculum?.levels.find((l) => !earned.has(l.code));
  const nextUnits = next ? curriculum!.units.filter((u) => u.levelCode === next.code) : [];
  const nextDone = nextUnits.filter((u) => u.state === "done").length;

  return (
    <main className="mx-auto flex w-full max-w-[640px] flex-col gap-3 px-4 py-5">
      <h1 className="text-2xl font-bold">شهاداتي</h1>
      {(certificates ?? []).length === 0 && (
        <Card className="p-5 text-sm leading-relaxed text-muted-foreground">
          تحصل على شهادة إتمام عندما تنجح في اختبارات كل وحدات المستوى. شهادتك الأولى تنتظرك!
        </Card>
      )}
      {(certificates ?? []).map((c) => (
        <Card key={c.code} className="flex flex-col gap-3 border-accent p-5">
          <div className="flex items-start gap-3">
            <Award className="size-9 flex-none text-accent" aria-hidden="true" />
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">شهادة إتمام</p>
              <p className="text-lg font-bold">
                المستوى <En>{c.levels?.code}</En> — <MixedText text={c.paths?.title ?? ""} />
              </p>
              <p className="text-sm text-muted-foreground">
                {profile.full_name} · {new Date(c.issued_at).toLocaleDateString("ar", { day: "numeric", month: "long", year: "numeric" })}
              </p>
              <En as="p" className="mt-1 text-xs text-muted-foreground">
                {c.code}
              </En>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href={`/certificate/${c.code}`}>عرض وتنزيل PDF</Link>
            </Button>
            <CopyButton text={`${origin}/verify/${c.code}`} label="نسخ رابط التحقق" />
          </div>
        </Card>
      ))}
      {next && (
        <Card className="flex flex-col gap-2 p-4">
          <p className="font-semibold">
            التالية: المستوى <En>{next.code}</En>
          </p>
          <ProgressBar value={nextDone} max={Math.max(nextUnits.length, 1)} label={`تقدم ${next.code}`} />
          <p className="text-sm text-muted-foreground">
            {nextUnits.length ? `أنهيت ${nextDone} من ${nextUnits.length} وحدة منشورة.` : "وحدات هذا المستوى قيد الإعداد."}
          </p>
        </Card>
      )}
      <p className="text-xs text-muted-foreground">شهادات رفد شهادات إتمام داخلية، وليست شهادة IELTS أو TOEFL أو ما يعادلها.</p>
    </main>
  );
}
