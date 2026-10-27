import { En } from "@/components/en";
import { MixedText } from "@/components/mixed-text";
import type { Tables } from "@/types/db";

type Exam = Pick<Tables<"exams">, "code" | "name" | "availability_ye" | "locations" | "fee_note" | "payment_note" | "official_practice_url" | "verified_at">;

/** International exams as available from Yemen (admin-maintained, never hard-coded fees). */
export function ExamCards({ exams }: { exams: Exam[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {exams.map((e) => (
        <div key={e.code} className="flex flex-col gap-1.5 rounded-2xl border border-border bg-card p-4 text-sm">
          <En as="p" className="text-base font-bold">
            {e.name}
          </En>
          {e.availability_ye && <MixedText text={e.availability_ye} />}
          {e.locations && (
            <p className="text-muted-foreground">
              أين: <MixedText text={e.locations} />
            </p>
          )}
          {e.fee_note && (
            <p className="text-muted-foreground">
              الرسوم: <MixedText text={e.fee_note} />
            </p>
          )}
          {e.payment_note && (
            <p className="text-muted-foreground">
              الدفع: <MixedText text={e.payment_note} />
            </p>
          )}
          {e.official_practice_url && (
            <a href={e.official_practice_url} target="_blank" rel="noopener noreferrer" className="font-semibold">
              تدريب مجاني من الموقع الرسمي ↗
            </a>
          )}
          <p className="text-xs text-muted-foreground">
            {e.verified_at ? `آخر تحقق: ${new Date(e.verified_at).toLocaleDateString("ar")}` : "لم يُتحقق من هذه المعلومات بعد"}
          </p>
        </div>
      ))}
    </div>
  );
}
