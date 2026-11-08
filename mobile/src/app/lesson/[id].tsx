import { useEffect, useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQueryClient } from "@tanstack/react-query";
import type { LessonBlock } from "@shared/content/types";
import { LESSON_BLOCKERS_AR } from "@shared/gamification/blockers";
import { lessonSections, SECTION_ICONS } from "@shared/lesson/sections";
import { useLesson } from "@/data/lesson";
import { Game } from "@/features/games/game";
import { Audio, Reading, Story, Table } from "@/features/lesson/blocks";
import { Exercise } from "@/features/lesson/exercise";
import { Markdown } from "@/features/lesson/markdown";
import { markSolved, useSolved } from "@/features/lesson/solved";
import { LessonVideo, type VideoStatus } from "@/features/lesson/video";
import { fx } from "@/lib/fx";
import { supabase } from "@/lib/supabase";
import { Button, Card, colors, Header, LoadError, Loading, radius, Text } from "@/ui";

interface Step {
  key: string;
  title: string;
  icon: string;
  requires: string[];
  video?: boolean;
  blocks?: LessonBlock[];
  kind: "blocks" | "task" | "finish";
}

/**
 * A lesson, one step per screen (as on the web): the video first, then the explanation, exercises,
 * games and story. A step opens when the one before is done; the server checks everything again
 * when the lesson is completed (complete_lesson()).
 */
export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useLesson(id);
  const queryClient = useQueryClient();
  const solved = useSolved();
  const [step, setStep] = useState(0);
  /** Video progress reported during this visit, on top of what the server sent. */
  const [liveVideos, setLiveVideos] = useState<Record<string, VideoStatus>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stepKey = `raved:step:${id}`;

  useEffect(() => {
    void AsyncStorage.getItem(stepKey).then((v) => v && setStep(Number(v) || 0));
  }, [stepKey]);

  const steps = useMemo<Step[]>(() => {
    if (!q.data) return [];
    const d = q.data;
    const list: Step[] = lessonSections(d.blocks).map((s) => ({
      key: s.key,
      title: s.title,
      icon: SECTION_ICONS[s.kind],
      requires: s.requires,
      video: s.kind === "video",
      blocks: s.blocks,
      kind: "blocks",
    }));
    if (d.speakingTask || d.writingTask) list.push({ key: "task", title: "المهمة", icon: SECTION_ICONS.task, requires: [], kind: "task" });
    list.push({ key: "finish", title: "إنهاء الدرس", icon: SECTION_ICONS.finish, requires: [], kind: "finish" });
    return list;
  }, [q.data]);

  if (q.isLoading) return <Loading />;
  if (q.isError) return <LoadError onRetry={() => void q.refetch()} />;
  const d = q.data;
  if (!d) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <Header title="الدرس" />
        <Text style={{ padding: 16 }}>لم نجد هذا الدرس.</Text>
      </SafeAreaView>
    );
  }

  const videos: Record<string, VideoStatus> = { ...d.videos, ...liveVideos };
  const videoDone = d.tracked.every((v) => videos[v]?.done);
  const exerciseIds = d.blocks.flatMap((b) =>
    b.type === "exercise" && b.exercise
      ? [b.exercise.id]
      : (b.type === "game" && b.id && b.game) || (b.type === "story" && b.id && b.panels?.length)
        ? [b.id]
        : [],
  );
  const solvedCount = exerciseIds.filter((x) => solved.has(x)).length;
  const stepDone = (s: Step) => (s.video ? videoDone || d.completed : s.requires.every((r) => solved.has(r)) || d.completed);
  const current = Math.min(step, steps.length - 1);
  const s = steps[current];
  const canNext = s ? stepDone(s) : false;
  const go = (i: number) => {
    setStep(i);
    void AsyncStorage.setItem(stepKey, String(i));
    fx("pop");
  };
  const nextLabel = d.nextId ? "التالي" : d.quizId ? "إلى الاختبار" : "إلى الوحدة";
  const goNext = () =>
    d.nextId ? router.replace(`/lesson/${d.nextId}`) : d.quizId ? router.replace(`/quiz/${d.quizId}`) : router.replace(`/unit/${d.unit.id}`);

  async function complete() {
    setBusy(true);
    setError(null);
    const { error: e } = await supabase.rpc("complete_lesson", { p_lesson_id: d!.lesson.id });
    setBusy(false);
    if (e) {
      setError(LESSON_BLOCKERS_AR[e.message] ?? "تعذر الحفظ. تأكد من الاتصال وحاول مرة أخرى.");
      fx("bad");
      return;
    }
    fx("coin");
    void AsyncStorage.removeItem(stepKey);
    await queryClient.invalidateQueries();
    goNext();
  }

  if (d.locked && !d.completed) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <Header title={d.lesson.title} subtitle={`الوحدة ${d.unit.position}`} />
        <View style={{ padding: 24, gap: 12, alignItems: "center" }}>
          <Text style={{ fontSize: 48 }}>🔒</Text>
          <Text variant="heading">هذا الدرس مقفل</Text>
          <Text variant="muted" style={{ textAlign: "center" }}>
            الدروس تُفتح بالترتيب. أكمل الدرس الذي قبله أولاً.
          </Text>
          <Button title="إلى الوحدة" onPress={() => router.replace(`/unit/${d.unit.id}`)} />
        </View>
      </SafeAreaView>
    );
  }

  const tasks = [
    ...(d.speakingTask ? [{ label: "سجّل مهمة المحادثة", done: d.speakingDone, kind: "speaking" }] : []),
    ...(d.writingTask ? [{ label: "أرسل مهمة الكتابة", done: d.writingDone, kind: "writing" }] : []),
  ];
  const checklist = [
    ...(d.tracked.length ? [{ label: "شاهد فيديو الدرس (80% على الأقل)", done: videoDone }] : []),
    ...(exerciseIds.length ? [{ label: `أنهِ كل النشاطات (${solvedCount} من ${exerciseIds.length})`, done: solvedCount === exerciseIds.length }] : []),
    ...tasks.map((t) => ({ label: t.label, done: t.done })),
  ];
  const ready = checklist.every((c) => c.done);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top", "bottom"]}>
      <Header title={d.lesson.title} subtitle={`الوحدة ${d.unit.position} · الدرس ${d.index + 1} من ${d.count}`} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, padding: 10 }} style={{ flexGrow: 0 }}>
        {steps.map((st, i) => {
          const open = i <= current || steps.slice(0, i).every(stepDone);
          return (
            <Button key={st.key} title={`${st.icon} ${st.title}`} variant={i === current ? "primary" : "secondary"} disabled={!open} onPress={() => go(i)} />
          );
        })}
      </ScrollView>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
        {s?.kind === "blocks"
          ? (s.blocks ?? []).map((b, i) => (
              <BlockView key={i} block={b} d={d} solved={solved} videos={videos} setVideo={(id, v) => setLiveVideos((x) => ({ ...x, [id]: v }))} />
            ))
          : null}

        {s?.kind === "task" ? (
          <Card tone="ai">
            <Text variant="heading">مهمة الدرس</Text>
            {d.speakingTask ? <Text variant="en">🗣️ {d.speakingTask.prompt_en}</Text> : null}
            {d.writingTask ? <Text variant="en">✍️ {d.writingTask.prompt_en}</Text> : null}
            <Text variant="muted">يقيّمها الذكاء الاصطناعي (تقديري). تحتاج اتصالاً بالإنترنت.</Text>
            {tasks.map((t) => (
              <Button
                key={t.kind}
                title={`${t.done ? "✅ " : ""}${t.label}`}
                variant="secondary"
                onPress={() => router.push(`/task/${d.lesson.id}?kind=${t.kind}`)}
              />
            ))}
            {d.unit.roleplay ? (
              <Button title={`💬 تحدث مع ${d.unit.roleplay}`} variant="secondary" onPress={() => router.push(`/roleplay/${d.unit.id}`)} />
            ) : null}
          </Card>
        ) : null}

        {s?.kind === "finish" ? (
          <Card>
            {d.completed ? (
              <Button title={`مكتمل ✅ · ${nextLabel}`} onPress={goNext} />
            ) : (
              <>
                {checklist.map((c) => (
                  <Text key={c.label}>
                    {c.done ? "✅" : "⬜"} {c.label}
                  </Text>
                ))}
                {error ? <Text style={{ color: colors.error }}>{error}</Text> : null}
                <Button title={`أكملت الدرس · ${nextLabel}`} disabled={!ready} loading={busy} onPress={complete} />
              </>
            )}
          </Card>
        ) : null}

        <Button title="🤖 عندك سؤال؟ اسأل المساعد" variant="secondary" onPress={() => router.push(`/assistant/${d.lesson.id}`)} />

        {s && s.kind !== "finish" ? (
          <View style={{ borderRadius: radius.lg, gap: 6 }}>
            {!canNext ? <Text variant="small">{s.video ? "شاهد 80% من الفيديو لتتابع." : "أنهِ نشاطات هذه الخطوة لتتابع."}</Text> : null}
            <Button title="التالي" disabled={!canNext} onPress={() => go(current + 1)} />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

type LessonData = NonNullable<ReturnType<typeof useLesson>["data"]>;

function BlockView({
  block,
  d,
  solved,
  videos,
  setVideo,
}: {
  block: LessonBlock;
  d: LessonData;
  solved: Set<string>;
  videos: Record<string, VideoStatus>;
  setVideo: (id: string, v: VideoStatus) => void;
}) {
  switch (block.type) {
    case "text":
      return block.markdown_ar ? <Markdown source={block.markdown_ar} /> : null;
    case "video":
      return block.youtube_id ? (
        <LessonVideo block={block} words={d.words} status={videos[block.youtube_id]} onStatus={(v) => setVideo(block.youtube_id!, v)} />
      ) : null;
    case "exercise":
      return block.exercise ? <Exercise q={block.exercise} solved={solved.has(block.exercise.id)} /> : null;
    case "game":
      return block.id && block.game ? (
        <Game kind={block.game} words={d.words} title={block.title_ar} solved={solved.has(block.id)} onDone={() => markSolved(block.id!)} />
      ) : null;
    case "story":
      return <Story block={block} solved={Boolean(block.id && solved.has(block.id))} />;
    case "audio":
      return <Audio block={block} />;
    case "reading":
      return <Reading block={block} />;
    case "table":
      return <Table block={block} />;
  }
}
