import { useQuery } from "@tanstack/react-query";
import type { LessonBlock, PackageLesson } from "@shared/content/types";
import type { GameWord } from "@shared/games/logic";
import { isVideoPart, progressByKey, videoKey, type VideoProgressRow } from "@shared/lesson/video-part";
import { parseFeatures } from "@shared/paths/features";
import { supabase } from "@/lib/supabase";
import { useUserId } from "./student";

/** One lesson with everything its screen needs (same data as the web lesson page). */
export function useLesson(lessonId: string) {
  const userId = useUserId();
  return useQuery({
    queryKey: ["lesson", lessonId, userId],
    enabled: Boolean(userId && lessonId),
    queryFn: async () => {
      const uid = userId!;
      const { data: lesson, error } = await supabase
        .from("lessons")
        .select(
          "id, unit_id, title, skill, position, blocks, speaking_task, writing_task, units(id, title, position, roleplay, quizzes(id, kind), levels(code, paths(slug, features)))",
        )
        .eq("id", lessonId)
        .maybeSingle();
      if (error) throw error;
      if (!lesson || !lesson.units) return null;
      const blocks = (lesson.blocks ?? []) as unknown as LessonBlock[];
      const videoBlocks = blocks.flatMap((b) => (b.type === "video" && b.youtube_id && !b.needs_check ? [b] : []));
      // Keys: "id" for a whole video, "id@start" for a part (shared/lesson/video-part.ts).
      const tracked = [...new Set(videoBlocks.map(videoKey))];
      const wholeIds = [...new Set(videoBlocks.filter((b) => !isVideoPart(b)).map((b) => b.youtube_id!))];
      const partIds = [...new Set(videoBlocks.filter(isVideoPart).map((b) => b.youtube_id!))];
      const [siblings, progress, blocker, views, speaking, writing, vocab] = await Promise.all([
        supabase.from("lessons").select("id, position").eq("unit_id", lesson.unit_id).eq("archived", false).order("position"),
        supabase.from("lesson_progress").select("status, rating").eq("student_id", uid).eq("lesson_id", lesson.id).maybeSingle(),
        supabase.rpc("my_lesson_blocker", { p_lesson_id: lesson.id }),
        Promise.all([
          wholeIds.length
            ? supabase.from("video_views").select("youtube_id, watched_sec, duration_sec, completed_at").eq("student_id", uid).in("youtube_id", wholeIds)
            : Promise.resolve({ data: [] as VideoProgressRow[] }),
          partIds.length
            ? supabase
                .from("video_part_views")
                .select("youtube_id, start_sec, watched_sec, duration_sec, completed_at")
                .eq("student_id", uid)
                .in("youtube_id", partIds)
            : Promise.resolve({ data: [] as VideoProgressRow[] }),
        ]).then(([w, p]) => ({ data: progressByKey(w.data ?? [], p.data ?? []) })),
        supabase.from("speaking_attempts").select("id").eq("student_id", uid).eq("lesson_id", lesson.id).limit(1),
        supabase.from("writing_submissions").select("id").eq("student_id", uid).eq("lesson_id", lesson.id).limit(1),
        supabase.from("vocab_items").select("item_key, word, meaning_ar, example_en").eq("unit_id", lesson.unit_id).eq("archived", false).order("position"),
      ]);
      const unit = lesson.units;
      const features = parseFeatures(unit.levels?.paths?.features);
      const ordered = siblings.data ?? [];
      const index = ordered.findIndex((l) => l.id === lesson.id);
      const words: GameWord[] = (vocab.data ?? []).map((v) => ({ id: v.item_key, word: v.word, meaning: v.meaning_ar, example: v.example_en }));
      const videos: Record<string, { watched: number; duration: number; done: boolean }> = { ...views.data };
      return {
        lesson: { id: lesson.id, title: lesson.title, skill: lesson.skill },
        blocks,
        unit: { id: unit.id, title: unit.title, position: unit.position, roleplay: (unit.roleplay as { character_ar?: string } | null)?.character_ar ?? null },
        quizId: (unit.quizzes ?? []).find((q) => q.kind === "unit")?.id ?? null,
        index,
        count: ordered.length,
        nextId: ordered[index + 1]?.id ?? null,
        completed: progress.data?.status === "completed",
        locked: blocker.data === "locked",
        tracked,
        videos,
        words,
        speakingTask: features.speaking ? (lesson.speaking_task as PackageLesson["speaking_task"] | null) : null,
        writingTask: features.writing ? (lesson.writing_task as PackageLesson["writing_task"] | null) : null,
        speakingDone: (speaking.data ?? []).length > 0,
        writingDone: (writing.data ?? []).length > 0,
      };
    },
  });
}
