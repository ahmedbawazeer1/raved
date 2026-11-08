import type { Metadata } from "next";
import { BadgeCheck, Check, GraduationCap, Map as MapIcon } from "lucide-react";
import { ActionRow, Empty, PageHead, Panel } from "@/components/console/ui";
import { requireStaff } from "@/lib/auth/session";
import { loadConsoleSummary } from "@/lib/console/summary";

export const metadata: Metadata = { title: "المراجعة" };

/** Everything the factory produced that waits for a person: maps first, then units, oldest code first. */
export default async function ReviewPage() {
  const { isAdmin } = await requireStaff();
  const s = await loadConsoleSummary(isAdmin);

  const mine = isAdmin ? s.unitsForAdmin.filter((u) => u.teacherOk) : s.unitsForTeacher;
  const others = isAdmin ? s.unitsForAdmin.filter((u) => !u.teacherOk) : s.unitsForAdmin.filter((u) => u.teacherOk);
  const maps = isAdmin ? s.mapsInReview : s.mapsInReview.filter((m) => !m.teacherOk);
  const nothing = mine.length + maps.length === 0;

  return (
    <div className="flex flex-col gap-5">
      <PageHead
        title="المراجعة"
        sub={isAdmin ? "ما بناه المصنع وراجعه المعلم ينتظر اعتمادك أو نشرك." : "ما بناه المصنع ينتظر مراجعتك. عندما تنتهي اضغط «راجعتها» فيصل للمدير لينشره."}
      />

      {nothing ? (
        <Panel>
          <Empty icon={Check} tone="ok" title="لا شيء ينتظر مراجعتك">
            {isAdmin ? "تظهر هنا الخرائط والوحدات عندما تكون جاهزة لقرارك." : "تظهر هنا الخرائط والوحدات عندما يبنيها المصنع. يصلك إشعار عند وصول عمل جديد."}
          </Empty>
        </Panel>
      ) : (
        <section className="flex flex-col gap-2.5">
          <h2 className="text-base font-bold">ينتظرك</h2>
          {maps.map((m) => (
            <ActionRow
              key={m.levelId}
              href={`/studio/levels/${m.levelId}`}
              icon={MapIcon}
              tone="gold"
              urgent
              title={<>خريطة المستوى {m.code}</>}
              detail={isAdmin ? (m.teacherOk ? "راجعها المعلم · تنتظر اعتمادك" : "لم يراجعها معلم بعد · يمكنك اعتمادها مباشرة") : "راجعها ثم اضغط «راجعتها»"}
              cta={isAdmin ? "راجع واعتمد" : "راجعها"}
            />
          ))}
          {mine.map((u) => (
            <ActionRow
              key={u.id}
              href={`/studio/units/${u.id}`}
              icon={BadgeCheck}
              tone="gold"
              urgent
              title={
                <>
                  {u.code} · {u.title}
                </>
              }
              detail={isAdmin ? "راجعها المعلم · تنتظر نشرك" : "بناها المصنع · تنتظر مراجعتك"}
              cta={isAdmin ? "راجع وانشر" : "ابدأ المراجعة"}
            />
          ))}
        </section>
      )}

      {others.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <h2 className="text-base font-bold">{isAdmin ? "عند المعلم" : "راجعتها وتنتظر المدير"}</h2>
          {others.map((u) => (
            <ActionRow
              key={u.id}
              href={`/studio/units/${u.id}`}
              icon={GraduationCap}
              tone="blue"
              title={
                <>
                  {u.code} · {u.title}
                </>
              }
              detail={isAdmin ? "لم يراجعها المعلم بعد · يمكنك مراجعتها بنفسك" : "يصلك إشعار إن أرجعها المدير"}
              cta="افتحها"
            />
          ))}
        </section>
      )}
    </div>
  );
}
