import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { En } from "@/components/en";
import { MixedText } from "@/components/mixed-text";
import { PrintButton } from "@/components/student/copy-button";
import { requireActiveStudent } from "@/lib/auth/session";
import { getOrigin } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "شهادة إتمام" };

/** Printable certificate: the browser's "Save as PDF" gives a small file (no PDF library needed). */
export default async function CertificatePrintPage(props: PageProps<"/certificate/[code]">) {
  const { code } = await props.params;
  const { userId, profile } = await requireActiveStudent();
  const supabase = await createClient();
  const { data: c } = await supabase
    .from("certificates")
    .select("code, issued_at, levels(code, title), paths(title)")
    .eq("student_id", userId)
    .eq("code", code.toUpperCase())
    .maybeSingle();
  if (!c) notFound();
  const verifyUrl = `${await getOrigin()}/verify/${c.code}`;

  return (
    <div className="flex min-h-dvh flex-col items-center gap-4 bg-background p-4 print:bg-white print:p-0">
      <style>{"@page { size: A4 landscape; margin: 12mm; }"}</style>
      <PrintButton />
      <article className="flex aspect-[1.414] w-full max-w-[960px] flex-col items-center justify-center gap-4 rounded-2xl border-[6px] border-double border-primary bg-card p-8 text-center print:rounded-none print:border-4">
        <Image src="/brand/raved-logo-green.svg" alt="رفد" width={96} height={40} />
        <p className="text-lg text-muted-foreground">شهادة إتمام</p>
        <h1 className="text-4xl font-bold text-primary">{profile.full_name}</h1>
        <p className="text-xl leading-relaxed">
          أتمّ بنجاح المستوى <En className="font-bold">{c.levels?.code}</En> ({c.levels?.title}) في <MixedText text={c.paths?.title ?? ""} />
        </p>
        <p className="text-muted-foreground">{new Date(c.issued_at).toLocaleDateString("ar", { day: "numeric", month: "long", year: "numeric" })}</p>
        <p className="mt-4 max-w-[640px] text-sm text-muted-foreground">
          هذه شهادة إتمام داخلية من منصة رفد، وليست شهادة IELTS أو TOEFL أو ما يعادلها.
        </p>
        <p className="text-xs text-muted-foreground">
          للتحقق: <En>{verifyUrl}</En>
        </p>
      </article>
    </div>
  );
}
