import { View } from "react-native";
import { Card, colors, fonts, Text } from "@/ui";

const LABELS: Record<string, string> = {
  task: "المهمة",
  fluency: "الطلاقة",
  grammar: "القواعد",
  vocabulary: "المفردات",
  task_achievement: "إنجاز المهمة",
  coherence: "الترابط",
};

/** AI feedback for speaking or writing, always labelled «تقديري» (an estimate). */
export function FeedbackView({
  feedback,
  scores,
  cefr,
}: {
  feedback: Record<string, unknown> | null;
  scores: Record<string, number> | null;
  cefr: string | null;
}) {
  if (!feedback) return null;
  const corrections = (feedback.corrections ?? feedback.errors ?? []) as {
    wrong?: string;
    text?: string;
    right?: string;
    correction?: string;
    explanation_ar: string;
  }[];
  return (
    <Card tone="ai">
      <Text variant="heading">التقييم · تقديري{cefr ? ` · ${cefr}` : ""}</Text>
      {scores ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {Object.entries(scores).map(([k, v]) => (
            <View key={k} style={{ backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 }}>
              <Text variant="small">{LABELS[k] ?? k}</Text>
              <Text style={{ fontFamily: fonts.bold }}>{v} / 5</Text>
            </View>
          ))}
        </View>
      ) : null}
      {typeof feedback.strengths_ar === "string" ? <Text>👍 {feedback.strengths_ar}</Text> : null}
      {corrections.map((c, i) => (
        <View key={i} style={{ gap: 2 }}>
          <Text variant="en" style={{ color: colors.error, textDecorationLine: "line-through" }}>
            {c.wrong ?? c.text}
          </Text>
          <Text variant="en" style={{ color: colors.success }}>
            {c.right ?? c.correction}
          </Text>
          <Text variant="small">{c.explanation_ar}</Text>
        </View>
      ))}
      {typeof feedback.tip_ar === "string" ? <Text>💡 {feedback.tip_ar}</Text> : null}
      {typeof feedback.next_step_ar === "string" ? <Text>💡 {feedback.next_step_ar}</Text> : null}
      {typeof feedback.improved_version === "string" ? (
        <Text variant="en" style={{ color: colors.muted }}>
          {feedback.improved_version}
        </Text>
      ) : null}
    </Card>
  );
}
