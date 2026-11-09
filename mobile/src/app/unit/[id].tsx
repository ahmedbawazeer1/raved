import { Pressable, ScrollView, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { GUARDIAN_VIEWBOX, guardianFor, guardianMarkup } from "@shared/art/guardians";
import { useCurriculum } from "@/data/student";
import { Art, Button, Card, colors, Header, LoadError, Loading, Text } from "@/ui";

const SKILL: Record<string, string> = {
  grammar: "قواعد",
  vocabulary: "مفردات",
  listening: "استماع",
  reading: "قراءة",
  speaking: "محادثة",
  writing: "كتابة",
  review: "مراجعة",
};

/** One unit: its lessons in order (each opens after the one before) and the guardian quiz at the end. */
export default function UnitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useCurriculum();
  if (q.isLoading) return <Loading />;
  if (q.isError || !q.data) return <LoadError onRetry={() => void q.refetch()} />;
  const curriculum = q.data.curriculum;
  const unit = curriculum?.units.find((u) => u.id === id);
  if (!unit || !curriculum) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <Header title="الوحدة" />
        <View style={{ padding: 16 }}>
          <Text>لم نجد هذه الوحدة.</Text>
        </View>
      </SafeAreaView>
    );
  }
  const lessons = [...unit.lessons].sort((a, b) => a.position - b.position);
  const nextIndex = lessons.findIndex((l) => !curriculum.completedLessonIds.has(l.id));
  const allDone = nextIndex < 0;
  const guardian = guardianFor(unit.levelCode);
  const unitOpen = unit.state !== "locked";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top", "bottom"]}>
      <Header title={`${unit.stop ? `${unit.stop} · ` : ""}الوحدة ${unit.position}`} subtitle={unit.levelCode} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text variant="title">{unit.title}</Text>
        <Text variant="muted">
          {unit.lessonsDone} من {lessons.length} دروس مكتملة
        </Text>
        {lessons.map((l, i) => {
          const done = curriculum.completedLessonIds.has(l.id);
          const open = unitOpen && (done || i === nextIndex || i < nextIndex);
          return (
            <Pressable
              key={l.id}
              disabled={!open}
              onPress={() => router.push(`/lesson/${l.id}`)}
              accessibilityRole="button"
              accessibilityLabel={`الدرس ${i + 1}: ${l.title}${done ? " · مكتمل" : open ? "" : " · مقفل"}`}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                backgroundColor: i === nextIndex ? colors.primaryTint : colors.card,
                borderRadius: 16,
                padding: 14,
                borderWidth: 1,
                borderColor: i === nextIndex ? colors.primary : colors.border,
                opacity: open ? (pressed ? 0.8 : 1) : 0.55,
              })}
            >
              <Text style={{ fontSize: 22 }}>{done ? "✅" : open ? "▶️" : "🔒"}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "700" }} numberOfLines={2}>
                  {l.title}
                </Text>
                <Text variant="small">
                  {SKILL[l.skill] ?? l.skill}
                  {l.estMinutes ? ` · ${l.estMinutes} دقيقة` : ""}
                </Text>
              </View>
            </Pressable>
          );
        })}

        {unit.quizId ? (
          <Card tone={allDone ? "warning" : "plain"} style={{ alignItems: "center" }}>
            <Art markup={guardianMarkup(guardian.id)} viewBox={GUARDIAN_VIEWBOX} width={110} height={128} />
            <Text variant="heading" style={{ textAlign: "center" }}>
              {unit.quizPassed ? `هزمت ${guardian.name} 🏅` : `حارس المحطة: ${guardian.name}`}
            </Text>
            <Text variant="muted" style={{ textAlign: "center" }}>
              {allDone ? "أكملت الدروس. واجه الحارس لتأخذ ختم المحطة وتفتح الوحدة التالية." : "يفتح الاختبار بعد إكمال كل الدروس."}
            </Text>
            {allDone ? (
              <Button title={unit.quizPassed ? "أعد المواجهة" : "واجه الحارس"} variant="accent" onPress={() => router.push(`/quiz/${unit.quizId}`)} />
            ) : null}
          </Card>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
