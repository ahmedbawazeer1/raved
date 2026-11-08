import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ImproveUnitForm } from "@/components/studio/improve-form";
import { requireStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { improvementNote, ITEM_FLAG_AR, type ItemStat } from "@/lib/agent/improve";

export const metadata: Metadata = { title: "التحسين" };

export default async function InsightsPage() {
  const { isAdmin } = await requireStaff();
  const supabase = await createClient();
  const { data: rows } = await supabase.from("unit_insights").select("*").order("flagged", { ascending: false }).order("computed_at", { ascending: false });
  const ids = (rows ?? []).map((r) => r.unit_id);
  const { data: units } = ids.length
    ? await supabase.from("units").select("id, code, title").in("id", ids)
    : { data: [] as { id: string; code: string; title: string }[] };
  const unitOf = new Map((units ?? []).map((u) => [u.id, u]));

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">التحسين الأسبوعي</h1>
        <p className="max-w-3xl text-muted-foreground">
          كل جمعة يحلل النظام إجابات الطلاب في اختبارات الوحدات وتقييمهم للدروس، بلا أسماء. لكل سؤال: نسبة من أجاب صح، وهل يميّز بين من فهم ومن لم يفهم. يظهر
          هنا ما يحتاج تحسيناً، ويمكن إرسال الوحدة للمصنع ليعيد بناءها بهذه الملاحظات.
        </p>
      </header>
      {!rows?.length ? (
        <Card className="p-5 text-muted-foreground">لا توجد نتائج بعد. تظهر بعد أن يدرس الطلاب الوحدات المنشورة ويحلوا اختباراتها.</Card>
      ) : (
        rows.map((r) => {
          const u = unitOf.get(r.unit_id);
          const items = (Array.isArray(r.items) ? r.items : []) as unknown as ItemStat[];
          const lessons = (Array.isArray(r.lessons) ? r.lessons : []) as unknown as { lesson: string; share: number; votes: number }[];
          const flagged = items.filter((i) => i.flag);
          const note = improvementNote(items, lessons);
          return (
            <Card key={r.unit_id} className="flex flex-col gap-3 p-5">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-lg font-semibold" dir="ltr">
                  {u?.code} · {u?.title}
                </h2>
                <Badge tone={r.flagged ? "warning" : "success"}>{r.flagged ? `${r.flagged} ملاحظة` : "لا ملاحظات"}</Badge>
                <span className="text-sm text-muted-foreground tabular-nums">
                  {r.attempts} محاولة · النجاح {Math.round(Number(r.pass_rate) * 100)}%
                </span>
              </div>
              {flagged.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-muted-foreground">
                        <th className="py-1 text-start font-semibold">السؤال</th>
                        <th className="px-2 text-center font-semibold">أجاب صح</th>
                        <th className="px-2 text-center font-semibold">التمييز</th>
                        <th className="py-1 text-start font-semibold">المشكلة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {flagged.map((i) => (
                        <tr key={i.id} className="border-t border-border">
                          <td className="py-2" dir="ltr">
                            {i.prompt}
                          </td>
                          <td className="px-2 text-center tabular-nums">{Math.round(i.p * 100)}%</td>
                          <td className={`px-2 text-center tabular-nums ${i.discrimination < 0 ? "font-bold text-destructive" : ""}`}>{i.discrimination}</td>
                          <td className="py-2">{ITEM_FLAG_AR[i.flag!]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {lessons.some((l) => l.votes >= 5 && l.share >= 0.3) && (
                <ul className="text-sm">
                  {lessons
                    .filter((l) => l.votes >= 5 && l.share >= 0.3)
                    .map((l) => (
                      <li key={l.lesson}>
                        «{l.lesson}»: {Math.round(l.share * 100)}% من {l.votes} طالباً قيّموه «غير مفيد»
                      </li>
                    ))}
                </ul>
              )}
              {isAdmin && note && <ImproveUnitForm unitId={r.unit_id} note={note} />}
            </Card>
          );
        })
      )}
    </div>
  );
}
