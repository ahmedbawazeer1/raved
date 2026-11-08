import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { appApi } from "@/lib/api";
import { fx } from "@/lib/fx";
import { speak } from "@/lib/speech";
import { Button, Card, colors, fonts, Header, LoadError, Loading, radius, Text } from "@/ui";

interface QuestionView {
  id: string;
  skill: string;
  prompt: string;
  text: string | null;
  listen: string | null;
  options: string[];
}
type State =
  | { status: "unavailable" }
  | { status: "ready"; retake: boolean }
  | { status: "completed"; level: string | null; etaMonths: number | null }
  | { status: "in_progress"; attemptId: string; question: QuestionView; answered: number };

const MAX = 32;

/** Placement test: adaptive questions graded on the server (the answers never reach the phone). */
export default function PlacementScreen() {
  const queryClient = useQueryClient();
  const q = useQuery({ queryKey: ["placement"], queryFn: () => appApi<State>("placement", { action: "state" }) });
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const [live, setLive] = useState<(State & { error?: string }) | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (q.isLoading) return <Loading />;
  const state = live ?? q.data;
  if (q.isError || !state || state.error) return <LoadError onRetry={() => void q.refetch()} />;

  async function start() {
    setBusy(true);
    const res = await appApi<State>("placement", { action: "start" });
    setBusy(false);
    if (res.error) return setError(res.error);
    setLive(res);
  }
  async function answer(value: number | null) {
    if (state?.status !== "in_progress") return;
    setBusy(true);
    setError(null);
    const res = await appApi<{ ok: boolean; done?: boolean; question?: QuestionView; answered?: number }>("placement", {
      action: "answer",
      attemptId: state.attemptId,
      questionId: state.question.id,
      answer: value,
    });
    setBusy(false);
    setPicked(null);
    if (!res.ok) return setError(res.error ?? "تعذر حفظ إجابتك. حاول مرة أخرى.");
    fx("pop");
    if (res.done) {
      const final = await appApi<State>("placement", { action: "state" });
      setLive(final);
      fx("coin");
      void queryClient.invalidateQueries();
      return;
    }
    setLive({ status: "in_progress", attemptId: state.attemptId, question: res.question!, answered: res.answered ?? 0 });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top", "bottom"]}>
      <Header title="اختبار تحديد المستوى" subtitle={state.status === "in_progress" ? `السؤال ${state.answered + 1}` : undefined} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        {state.status === "unavailable" ? <Text>لا يوجد اختبار مستوى لمسارك.</Text> : null}
        {state.status === "ready" ? (
          <Card>
            <Text variant="heading">{state.retake ? "أعد اختبار المستوى" : "لنعرف من أين تبدأ"}</Text>
            <Text variant="muted">حوالي 20 دقيقة: مفردات وقواعد وقراءة واستماع. ليس امتحاناً، ولا نجاح أو رسوب. إذا لم تعرف الإجابة اضغط «لا أعرف».</Text>
            <Button title="ابدأ الاختبار" loading={busy} onPress={() => void start()} />
          </Card>
        ) : null}
        {state.status === "completed" ? (
          <Card tone="primary">
            <Text variant="heading">مستواك: {state.level ?? "—"} 🎯</Text>
            {state.etaMonths ? <Text variant="muted">بدراستك اليومية تصل إلى B2 في حوالي {state.etaMonths} شهراً.</Text> : null}
            <Button title="ابدأ رحلتك" onPress={() => router.replace("/today")} />
          </Card>
        ) : null}
        {state.status === "in_progress" ? (
          <>
            <View style={{ height: 8, borderRadius: 999, backgroundColor: colors.border, overflow: "hidden" }}>
              <View style={{ width: `${Math.min(100, (state.answered / MAX) * 100)}%`, height: "100%", backgroundColor: colors.accent }} />
            </View>
            <Card>
              {state.question.text ? (
                <Text variant="en" style={{ lineHeight: 26 }}>
                  {state.question.text}
                </Text>
              ) : null}
              {state.question.listen ? <Button title="🔊 استمع" variant="secondary" onPress={() => speak(state.question.listen!)} /> : null}
              <Text variant={/[A-Za-z]/.test(state.question.prompt) ? "en" : "body"} style={{ fontFamily: fonts.semibold, fontSize: 17 }}>
                {state.question.prompt}
              </Text>
              {state.question.options.map((o, i) => (
                <Pressable
                  key={i}
                  onPress={() => setPicked(i)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: picked === i }}
                  style={{
                    minHeight: 48,
                    justifyContent: "center",
                    paddingHorizontal: 14,
                    borderRadius: radius.md,
                    borderWidth: 2,
                    borderColor: picked === i ? colors.primary : colors.border,
                    backgroundColor: picked === i ? colors.primaryTint : colors.card,
                  }}
                >
                  <Text variant={/[A-Za-z]/.test(o) ? "en" : "body"}>{o}</Text>
                </Pressable>
              ))}
            </Card>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Button title="لا أعرف" variant="secondary" disabled={busy} onPress={() => void answer(null)} />
              </View>
              <View style={{ flex: 2 }}>
                <Button title="التالي" disabled={picked === null} loading={busy} onPress={() => void answer(picked)} />
              </View>
            </View>
          </>
        ) : null}
        {error ? <Text style={{ color: colors.error }}>{error}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}
