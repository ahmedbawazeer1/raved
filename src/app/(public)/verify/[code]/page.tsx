import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, CircleX } from "lucide-react";
import { Card } from "@/components/ui/card";
import { En } from "@/components/en";
import { MixedText } from "@/components/mixed-text";
import { createPublicClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "التحقق من شهادة", robots: { index: false } };

interface Verified {
  name: string;
  level_code: string;
  level_title: string;
  path_title: string;
  issued_at: string;
}

export default async function VerifyPage(props: PageProps<"/verify/[code]">) {
  const { code } = await props.params;
  const valid = /^[A-Za-z0-9]{6,20}$/.test(code);
  const { data } = valid ? await createPublicClient().rpc("verify_certificate", { p_code: code }) : { data: null };
  const cert = data as unknown as Verified | null;

  return (
    <main className="mx-auto flex w-full max-w-[520px] flex-col gap-4 px-4 py-10">
      <h1 className="text-2xl font-bold">التحقق من شهادة</h1>
      {cert ? (
        <Card className="flex flex-col gap-3 p-5">
          <p className="flex items-center gap-2 font-bold text-success">
            <BadgeCheck className="size-6" aria-hidden="true" />
            شهادة صحيحة
          </p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[15px]">
            <dt className="text-muted-foreground">الاسم</dt>
            <dd>{cert.name}</dd>
            <dt className="text-muted-foreground">الشهادة</dt>
            <dd>
              إتمام المستوى <En>{cert.level_code}</En> — <MixedText text={cert.path_title} />
            </dd>
            <dt className="text-muted-foreground">التاريخ</dt>
            <dd>{new Date(cert.issued_at).toLocaleDateString("ar", { day: "numeric", month: "long", year: "numeric" })}</dd>
            <dt className="text-muted-foreground">الرمز</dt>
            <dd>
              <En>{code.toUpperCase()}</En>
            </dd>
          </dl>
          <p className="rounded-lg bg-muted p-3 text-sm leading-relaxed text-subtle">
            هذه شهادة إتمام داخلية من منصة رفد، وليست شهادة IELTS أو TOEFL أو ما يعادلها.
          </p>
        </Card>
      ) : (
        <Card className="flex flex-col gap-2 p-5">
          <p className="flex items-center gap-2 font-bold text-destructive">
            <CircleX className="size-6" aria-hidden="true" />
            لم نجد شهادة بهذا الرمز
          </p>
          <p className="text-sm text-muted-foreground">تأكد من كتابة الرمز كما هو على الشهادة.</p>
        </Card>
      )}
      <Link href="/" className="text-sm">
        منصة رفد ←
      </Link>
    </main>
  );
}
