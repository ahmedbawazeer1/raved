import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, TextInput, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Crypto from "expo-crypto";
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from "expo-audio";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { PackageLesson } from "@shared/content/types";
import { FeedbackView } from "@/features/ai/feedback";
import { appApi, transcribe } from "@/lib/api";
import { fx } from "@/lib/fx";
import { supabase } from "@/lib/supabase";
import { Button, Card, colors, fonts, Header, LoadError, Loading, radius, Text } from "@/ui";

/**
 * The lesson's speaking or writing task. Speaking: record (max 90 s), the server turns it into text and
 * deletes the audio, then evaluates the text. Writing: send the text. Both feedbacks are «تقديري».
 */
export default function TaskScreen() {
  const { lessonId, kind } = useLocalSearchParams<{ lessonId: string; kind: "speaking" | "writing" }>();
  const queryClient = useQueryClient();
  const q = useQuery({
    queryKey: ["task", lessonId, kind],
    queryFn: async () => {
      const { data } = await supabase.from("lessons").select("title, speaking_task, writing_task").eq("id", lessonId).maybeSingle();
      return data;
    },
  });
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    feedback: Record<string, unknown> | null;
    scores: Record<string, number> | null;
    cefr: string | null;
    queued?: boolean;
  } | null>(null);
  const clientId = useMemo(() => Crypto.randomUUID(), []);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const rec = useAudioRecorderState(recorder);
  const maxSeconds = useRef(90);
  // Stop automatically at the task's time limit and evaluate what was said.
  useEffect(() => {
    if (rec.isRecording && (rec.durationMillis ?? 0) / 1000 >= maxSeconds.current) void toggleRecording();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rec.isRecording, rec.durationMillis]);

  if (q.isLoading) return <Loading />;
  if (q.isError || !q.data) return <LoadError onRetry={() => void q.refetch()} />;
  const speaking = q.data.speaking_task as PackageLesson["speaking_task"] | null;
  const writing = q.data.writing_task as PackageLesson["writing_task"] | null;
  const task = kind === "speaking" ? speaking : writing;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  async function showResult(table: "speaking_attempts" | "writing_submissions", id: string, queued?: boolean) {
    const { data } = await supabase.from(table).select("feedback, scores, estimated_cefr").eq("id", id).maybeSingle();
    setResult({
      feedback: (data?.feedback as Record<string, unknown> | null) ?? null,
      scores: (data?.scores as Record<string, number> | null) ?? null,
      cefr: data?.estimated_cefr ?? null,
      queued,
    });
    void queryClient.invalidateQueries();
  }

  async function sendWriting() {
    setBusy(true);
    setError(null);
    const res = await appApi<{ id?: string; queued?: boolean }>("writing", { lessonId, text, clientId, parentId: null });
    setBusy(false);
    if (res.error && !res.id) return setError(res.error);
    fx("coin");
    if (res.id) await showResult("writing_submissions", res.id, res.queued);
  }

  async function toggleRecording() {
    setError(null);
    if (rec.isRecording) {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) return setError("لم يصل التسجيل. حاول مرة أخرى.");
      setBusy(true);
      const t = await transcribe(uri);
      if (!t.text) {
        setBusy(false);
        return setError(t.error ?? "لم نسمع كلاماً واضحاً. حاول مرة أخرى.");
      }
      const res = await appApi<{ id?: string }>("speaking", {
        lessonId,
        transcript: t.text,
        durationSec: Math.round((rec.durationMillis ?? 0) / 1000),
        transcription: "whisper",
      });
      setBusy(false);
      if (res.error || !res.id) return setError(res.error ?? "تعذر التقييم. حاول مرة أخرى.");
      fx("coin");
      await showResult("speaking_attempts", res.id);
      return;
    }
    const perm = await AudioModule.requestRecordingPermissionsAsync();
    if (!perm.granted) return setError("اسمح لرفد باستخدام الميكروفون من إعدادات الجوال.");
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    fx("pop");
  }

  const seconds = Math.floor((rec.durationMillis ?? 0) / 1000);
  maxSeconds.current = speaking?.max_seconds ?? 90;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top", "bottom"]}>
      <Header title={kind === "speaking" ? "مهمة المحادثة" : "مهمة الكتابة"} subtitle={q.data.title} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
        {!task ? (
          <Text>لا توجد مهمة لهذا الدرس.</Text>
        ) : (
          <>
            <Card>
              <Text variant="en" style={{ fontFamily: fonts.enBold, fontSize: 17 }}>
                {task.prompt_en}
              </Text>
              {kind === "speaking" && speaking?.helpful_phrases?.length ? (
                <Text variant="en" style={{ color: colors.muted }}>
                  {speaking.helpful_phrases.join(" · ")}
                </Text>
              ) : null}
              {kind === "writing" && writing ? (
                <Text variant="small">
                  من {writing.min_words} إلى {writing.max_words} كلمة
                </Text>
              ) : null}
            </Card>

            {result ? (
              <>
                {result.queued ? (
                  <Card tone="warning">
                    <Text>حُفظت إجابتك، وسيصلك التقييم عندما يتوفر.</Text>
                  </Card>
                ) : null}
                <FeedbackView feedback={result.feedback} scores={result.scores} cefr={result.cefr} />
                <Button title="حاول مرة أخرى" variant="secondary" onPress={() => setResult(null)} />
              </>
            ) : kind === "writing" ? (
              <>
                <TextInput
                  value={text}
                  onChangeText={setText}
                  multiline
                  accessibilityLabel="اكتب إجابتك بالإنجليزية"
                  placeholder="Write here…"
                  style={{
                    minHeight: 200,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: radius.md,
                    padding: 12,
                    fontFamily: fonts.en,
                    fontSize: 16,
                    textAlign: "left",
                    textAlignVertical: "top",
                    backgroundColor: colors.card,
                  }}
                />
                <Text variant="small">{words} كلمة</Text>
                <Button title="أرسل للتقييم" disabled={!writing || words < writing.min_words} loading={busy} onPress={() => void sendWriting()} />
              </>
            ) : (
              <View style={{ gap: 10, alignItems: "center" }}>
                <Text variant="muted" style={{ textAlign: "center" }}>
                  تكلم بالإنجليزية حتى {speaking?.max_seconds ?? 90} ثانية. يتحول صوتك إلى نص ثم يُحذف.
                </Text>
                {rec.isRecording ? <Text style={{ fontFamily: fonts.bold, fontSize: 22, color: colors.error }}>● {seconds} ث</Text> : null}
                <Button
                  title={rec.isRecording ? "أنهيت، قيّمني" : busy ? "جارٍ التقييم…" : "🎤 ابدأ التسجيل"}
                  loading={busy}
                  onPress={() => void toggleRecording()}
                />
              </View>
            )}
            {error ? <Text style={{ color: colors.error }}>{error}</Text> : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
