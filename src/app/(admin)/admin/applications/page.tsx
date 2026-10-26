import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Alert, Select } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { En } from "@/components/en";
import { ReviewForm } from "@/components/admin/review-form";
import { createClient } from "@/lib/supabase/server";
import { ageFrom, gradeLabel, maskPhone, streamLabel } from "@/lib/yemen";
import { targetDateLabel, targetExamLabel } from "@/lib/apply/options";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "طلبات الالتحاق" };

const STATUSES: { value: string; label: string; tone: BadgeProps["tone"] }[] = [
  { value: "submitted", label: "قيد المراجعة", tone: "warning" },
  { value: "needs_changes", label: "بانتظار تعديل الطالب", tone: "info" },
  { value: "approved", label: "مقبول", tone: "success" },
  { value: "rejected", label: "مرفوض", tone: "destructive" },
  { value: "draft", label: "لم يُرسل بعد", tone: "muted" },
];

const DONE: Record<string, string> = {
  approved: "قُبل الطالب، وأرسلنا له إشعاراً.",
  needs_changes: "أُرسل طلب التعديل للطالب.",
  rejected: "رُفض الطلب، وأُبلغ الطالب.",
};

function since(date: string | null): string {
  if (!date) return "";
  const hours = Math.round((Date.now() - new Date(date).getTime()) / 36e5);
  if (hours < 1) return "منذ قليل";
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.round(hours / 24);
  return days === 1 ? "منذ يوم" : days === 2 ? "منذ يومين" : `منذ ${days} أيام`;
}

const SELECT =
  "id, status, submitted_at, created_at, target_exam, target_date, daily_minutes, motivation, recommendation_path, recommendation_name, recommendation_size, guardian_consent_at, privacy_consent_at, review_note, reviewed_at, paths(title), student:profiles!applications_student_id_fkey(full_name, email, birth_date, governorate, city, school, grade, stream, phone, governorates(name_ar))";

export default async function ApplicationsPage({ searchParams }: PageProps<"/admin/applications">) {
  const sp = await searchParams;
  const status = STATUSES.some((s) => s.value === sp.status) ? String(sp.status) : "submitted";
  const governorate = typeof sp.gov === "string" ? sp.gov : "";
  const selectedId = typeof sp.id === "string" ? sp.id : undefined;
  const done = typeof sp.done === "string" ? DONE[sp.done] : undefined;

  const supabase = await createClient();
  let query = supabase.from("applications").select(SELECT).eq("status", status).order("submitted_at", { ascending: true, nullsFirst: false }).limit(100);
  if (governorate) query = query.eq("student.governorate", governorate);
  const [{ data: rows }, { data: governorates }] = await Promise.all([
    query,
    supabase.from("governorates").select("code, name_ar").order("position"),
  ]);
  const list = (rows ?? []).filter((r) => r.student);

  let selected = selectedId ? list.find((r) => r.id === selectedId) : undefined;
  if (selectedId && !selected) {
    const { data } = await supabase.from("applications").select(SELECT).eq("id", selectedId).maybeSingle();
    selected = data ?? undefined;
  }
  const nextId = selected ? list.find((r) => r.id !== selected!.id && r.status === "submitted")?.id : undefined;

  let fileUrl: string | null = null;
  if (selected?.recommendation_path) {
    const { data } = await supabase.storage.from("recommendations").createSignedUrl(selected.recommendation_path, 600);
    fileUrl = data?.signedUrl ?? null;
  }
  const isPdf = selected?.recommendation_name?.toLowerCase().endsWith(".pdf");
  const statusInfo = (s: string) => STATUSES.find((x) => x.value === s)!;

  return (
    <div className="flex flex-col gap-5">
      <div className={cn("flex flex-wrap items-center justify-between gap-4", selected && "max-md:hidden")}>
        <h1 className="text-[28px] font-bold">طلبات الالتحاق</h1>
        <form className="flex flex-wrap gap-2" method="get">
          <label htmlFor="f-status" className="sr-only">
            الحالة
          </label>
          <Select id="f-status" name="status" defaultValue={status} className="min-h-11 w-auto">
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
          <label htmlFor="f-gov" className="sr-only">
            المحافظة
          </label>
          <Select id="f-gov" name="gov" defaultValue={governorate} className="min-h-11 w-auto">
            <option value="">كل المحافظات</option>
            {(governorates ?? []).map((g) => (
              <option key={g.code} value={g.code}>
                {g.name_ar}
              </option>
            ))}
          </Select>
          <Button type="submit" variant="secondary">
            عرض
          </Button>
        </form>
      </div>

      {done && <Alert tone="success">{done}</Alert>}

      <div className="flex flex-wrap items-start gap-5">
        <section aria-label="قائمة الطلبات" className={cn("w-full overflow-hidden rounded-2xl border border-border bg-card md:max-w-[400px] md:flex-[1_1_320px]", selected && "max-md:hidden")}>
          {list.length === 0 && <p className="p-5 text-sm text-muted-foreground">لا توجد طلبات بهذه الحالة.</p>}
          {list.map((r) => {
            const s = r.student!;
            const active = r.id === selected?.id;
            return (
              <Link
                key={r.id}
                href={`/admin/applications?status=${status}${governorate ? `&gov=${governorate}` : ""}&id=${r.id}`}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "flex items-center gap-3 border-b border-muted px-4 py-3 text-foreground no-underline last:border-b-0 hover:bg-background hover:text-foreground",
                  active && "border-s-4 border-s-primary bg-primary-tint",
                )}
              >
                <span className="flex size-10 flex-none items-center justify-center rounded-full bg-primary font-bold text-white">
                  {s.full_name.charAt(0) || "؟"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold">{s.full_name || "بلا اسم"}</p>
                  <p className="text-[13px] text-muted-foreground">
                    <En>{targetExamLabel(r.target_exam)}</En> · {s.governorates?.name_ar ?? "—"}
                  </p>
                </div>
                {r.recommendation_path ? (
                  <span className="text-xs text-muted-foreground">{since(r.submitted_at ?? r.created_at)}</span>
                ) : (
                  <Badge tone="destructive">بلا توصية</Badge>
                )}
              </Link>
            );
          })}
        </section>

        {selected?.student ? (
          <section aria-label="تفاصيل الطلب" className="flex w-full min-w-0 flex-col gap-5 rounded-2xl border border-border bg-card p-5 md:flex-[999_1_460px] md:p-6">
            <Link href={`/admin/applications?status=${status}`} className="-mt-1 flex min-h-11 items-center gap-1 text-sm md:hidden">
              <ArrowRight className="size-4" aria-hidden="true" /> كل الطلبات
            </Link>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <span className="flex size-[52px] items-center justify-center rounded-full bg-primary text-xl font-bold text-white">
                  {selected.student.full_name.charAt(0) || "؟"}
                </span>
                <div>
                  <h2 className="text-xl font-bold">{selected.student.full_name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {selected.submitted_at ? `قدّم ${since(selected.submitted_at)}` : "لم يُرسل بعد"} · <En>{selected.student.email}</En>
                  </p>
                </div>
              </div>
              <Badge tone={statusInfo(selected.status).tone}>{statusInfo(selected.status).label}</Badge>
            </div>

            <dl className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-4 rounded-xl bg-background p-4">
              {[
                ["المسار", selected.paths?.title ?? "—"],
                ["الامتحان المستهدف", targetExamLabel(selected.target_exam)],
                ["الموعد", targetDateLabel(selected.target_date)],
                ["الدقائق اليومية", selected.daily_minutes ? `${selected.daily_minutes} دقيقة` : "—"],
                ["الصف", `${gradeLabel(selected.student.grade)} · ${streamLabel(selected.student.stream)}`],
                ["المدرسة", selected.student.school ?? "—"],
                ["المحافظة", `${selected.student.governorates?.name_ar ?? "—"} · ${selected.student.city ?? ""}`],
                ["العمر", selected.student.birth_date ? `${ageFrom(selected.student.birth_date)} سنة` : "—"],
                ["الهاتف", selected.student.phone ? maskPhone(selected.student.phone) : "—"],
                ["موافقة ولي الأمر", selected.guardian_consent_at ? "نعم" : "لا"],
              ].map(([k, v]) => (
                <div key={k} className="flex flex-col gap-0.5">
                  <dt className="text-xs text-muted-foreground">{k}</dt>
                  <dd className={cn("font-semibold", k === "موافقة ولي الأمر" && (v === "نعم" ? "text-success" : "text-destructive"))}>
                    {k === "الهاتف" ? <En>{v}</En> : v}
                  </dd>
                </div>
              ))}
            </dl>

            {selected.motivation && (
              <div className="flex flex-col gap-1.5">
                <p className="text-sm font-semibold">لماذا يريد الشهادة</p>
                <p className="text-[15px] leading-[1.8]">«{selected.motivation}»</p>
              </div>
            )}

            {selected.review_note && (
              <Alert tone="info">
                <b>آخر ملاحظة أُرسلت:</b> {selected.review_note}
              </Alert>
            )}

            <div className="overflow-hidden rounded-xl border border-border">
              <div className="flex items-center justify-between gap-2 border-b border-border bg-background px-3.5 py-2.5">
                <span className="truncate text-sm font-semibold">{selected.recommendation_name ?? "توصية المعلم"}</span>
                {fileUrl && (
                  <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center gap-1 text-[13px]">
                    فتح في نافذة جديدة <ExternalLink className="size-3.5" aria-hidden="true" />
                  </a>
                )}
              </div>
              {fileUrl ? (
                isPdf ? (
                  <iframe src={fileUrl} title="ملف التوصية" className="h-[420px] w-full bg-white" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL, not optimisable
                  <img src={fileUrl} alt="صورة توصية المعلم" className="max-h-[520px] w-full bg-white object-contain" />
                )
              ) : (
                <p className="p-5 text-sm text-muted-foreground">
                  {selected.recommendation_path ? "تعذر فتح الملف. حدّث الصفحة." : "لم يرفع الطالب توصية."}
                </p>
              )}
            </div>

            {["submitted", "needs_changes", "rejected"].includes(selected.status) ? (
              <ReviewForm applicationId={selected.id} nextId={nextId} />
            ) : (
              <p className="text-sm text-muted-foreground">
                {selected.status === "approved" ? "هذا الطلب مقبول." : "الطالب لم يرسل طلبه بعد."}
              </p>
            )}
          </section>
        ) : (
          list.length > 0 && (
            <Card className="hidden p-6 text-sm text-muted-foreground md:block md:flex-[999_1_460px]">اختر طلباً من القائمة لعرضه.</Card>
          )
        )}
      </div>
    </div>
  );
}
