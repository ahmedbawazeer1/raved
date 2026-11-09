import { Pressable, RefreshControl, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import type { UnitView } from "@shared/student/progress";
import { useCurriculum } from "@/data/student";
import { RiverMap } from "@/features/journey/river-map";
import { Card, colors, LoadError, Loading, Text } from "@/ui";

const STATE: Record<UnitView["state"], { icon: string; label: string }> = {
  done: { icon: "✅", label: "مكتملة" },
  now: { icon: "📍", label: "محطتك الآن" },
  open: { icon: "🔓", label: "مفتوحة للمراجعة" },
  locked: { icon: "🔒", label: "مقفلة" },
};

/** «التعلّم»: the river map of the current level and every level's units. */
export default function LearnScreen() {
  const q = useCurriculum();
  if (q.isLoading) return <Loading />;
  if (q.isError || !q.data) return <LoadError onRetry={() => void q.refetch()} />;
  const { path, curriculum } = q.data;
  const units = curriculum?.units ?? [];
  const current = units.find((u) => u.state === "now") ?? units.at(-1);
  const mapUnits = current ? units.filter((u) => u.levelCode === current.levelCode) : [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16 }}
        refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} tintColor={colors.primary} />}
      >
        <Text variant="title">{path?.title ?? "التعلّم"}</Text>
        {!units.length ? (
          <Card>
            <Text variant="heading">الدروس قيد الإعداد</Text>
            <Text variant="muted">سننشر أول وحدة قريباً.</Text>
          </Card>
        ) : null}
        {mapUnits.length && current ? <RiverMap units={mapUnits} levelCode={current.levelCode} /> : null}
        {(curriculum?.levels ?? []).map((level) => {
          const list = units.filter((u) => u.levelCode === level.code);
          if (!list.length) return null;
          return (
            <View key={level.id} style={{ gap: 8 }}>
              <Text variant="heading">
                {level.code} · {level.title}
              </Text>
              {list.map((u) => (
                <Pressable
                  key={u.id}
                  disabled={u.state === "locked"}
                  onPress={() => router.push(`/unit/${u.id}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`الوحدة ${u.position}: ${u.title} · ${STATE[u.state].label}`}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    backgroundColor: u.state === "now" ? colors.primaryTint : colors.card,
                    borderRadius: 16,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: u.state === "now" ? colors.primary : colors.border,
                    opacity: u.state === "locked" ? 0.6 : pressed ? 0.8 : 1,
                  })}
                >
                  <Text style={{ fontSize: 22 }}>{STATE[u.state].icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "700" }}>الوحدة {u.position}</Text>
                    <Text variant="muted" numberOfLines={1}>
                      {u.title}
                    </Text>
                  </View>
                  <Text variant="small">
                    {u.lessonsDone}/{u.lessons.length}
                  </Text>
                </Pressable>
              ))}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
