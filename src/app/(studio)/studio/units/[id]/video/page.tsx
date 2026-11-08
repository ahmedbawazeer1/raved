import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHead, Panel } from "@/components/console/ui";
import { VideoPicker, type Candidate } from "@/components/studio/video-picker";
import { requireStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { FactoryOutput } from "@/lib/agent/factory";

export const metadata: Metadata = { title: "اختيار فيديو الدرس" };

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export default async function VideoPickerPage({ params, searchParams }: PageProps<"/studio/units/[id]/video">) {
  const { id } = await params;
  const n = Number((await searchParams).lesson) || 1;
  await requireStaff();
  const supabase = await createClient();
  const { data: unit } = await supabase.from("curriculum_units").select("id, code, title_en, build_job_id").eq("id", id).maybeSingle();
  if (!unit) notFound();
  const { data: job } = unit.build_job_id
    ? await supabase.from("agent_jobs").select("status, output").eq("id", unit.build_job_id).maybeSingle()
    : { data: null };
  const out = job?.status === "needs_review" ? (job.output as unknown as FactoryOutput | null) : null;
  const meta = out?.factory.lessons[n - 1];
  const lesson = out?.package.lessons[n - 1];
  const back = { label: `${unit.code} · الدرس ${n}`, href: `/studio/units/${unit.id}?lesson=${n}` };

  if (!out || !meta || !lesson) {
    return (
      <div className="flex flex-col gap-5">
        <PageHead crumbs={[back]} title="اختيار فيديو الدرس" />
        <Panel>
          <p className="text-muted-foreground">تغيير الفيديو متاح فقط والوحدة في المراجعة.</p>
        </Panel>
      </div>
    );
  }

  const candidates: Candidate[] = [
    ...(meta.video
      ? [
          {
            youtube_id: meta.video.youtube_id,
            title: meta.video.title,
            channel: meta.video.channel,
            current: true,
            detail: `من ${mmss(meta.video.part.start_sec)} إلى ${mmss(meta.video.part.end_sec)}${meta.video.rating ? ` · تقييم الوكيل ${meta.video.rating}/5` : ""}`,
          },
        ]
      : []),
    ...(meta.video?.alternatives ?? []).filter((a) => a.youtube_id !== meta.video?.youtube_id),
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHead
        crumbs={[back]}
        title={`فيديو الدرس ${n}: ${lesson.title}`}
        sub="كل درس له فيديو إجباري. الوكيل اختار الحالي وقيّمه من ترجمته النصية؛ هذه بدائل وجدها، أو الصق رابطاً تعرفه."
      />
      {candidates.length === 0 && (
        <Panel>
          <p className="text-sm text-muted-foreground">لم يجد الوكيل فيديو مناسباً لهذا الدرس. الصق رابط فيديو تعرفه، وسيبني الدرس حوله.</p>
        </Panel>
      )}
      <VideoPicker unitId={unit.id} lessonKey={meta.key} candidates={candidates} />
    </div>
  );
}
