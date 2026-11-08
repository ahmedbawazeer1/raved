import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { fetchActivityDates, fetchCurriculum, fetchPrimaryPath, fetchXpRows } from "@shared/data/student";
import { badges, playerLevel, statsFromXp } from "@shared/gamification/xp";
import { streakDays } from "@shared/student/stats";
import { useUserId } from "@/data/student";
import { supabase } from "@/lib/supabase";
import { Card, colors, fonts, Header, LoadError, Loading, ProgressBar, radius, Text } from "@/ui";

/** «تقدّمي»: player level, badges and the album of stamps from the journey (same rules as the web). */
export default function ProgressScreen() {
  const userId = useUserId();
  const q = useQuery({
    queryKey: ["progress", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const [rows, activity, path] = await Promise.all([
        fetchXpRows(supabase, userId!),
        fetchActivityDates(supabase, userId!),
        fetchPrimaryPath(supabase, userId!),
      ]);
      const curriculum = path ? await fetchCurriculum(supabase, userId!, path.id) : null;
      const streak = streakDays(activity);
      const stats = statsFromXp(rows, streak);
      return { stats, level: playerLevel(stats.xp), badges: badges(stats), units: curriculum?.units ?? [] };
    },
  });
  if (q.isLoading) return <Loading />;
  if (q.isError || !q.data) return <LoadError onRetry={() => void q.refetch()} />;
  const { stats, level, units } = q.data;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top", "bottom"]}>
      <Header title="تقدّمي" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        <Card tone="primary">
          <Text variant="heading">المستوى {level.level}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <ProgressBar value={level.into} max={level.span} color={colors.primary} track={colors.card} />
            <Text variant="small">
              {level.into}/{level.span}
            </Text>
          </View>
          <Text variant="muted">
            ⭐ {stats.xp} نقطة · 🔥 {stats.streak} يوم متتالٍ · 📚 {stats.lessons} درس
          </Text>
        </Card>

        <Text variant="heading">الشارات</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {q.data.badges.map((b) => (
            <View
              key={b.id}
              style={{
                width: "30%",
                alignItems: "center",
                gap: 4,
                padding: 8,
                borderRadius: radius.lg,
                backgroundColor: colors.card,
                opacity: b.earned ? 1 : 0.45,
              }}
            >
              <Text style={{ fontSize: 30 }}>{b.icon}</Text>
              <Text style={{ fontFamily: fonts.semibold, fontSize: 13, textAlign: "center" }}>{b.title}</Text>
              <Text variant="small" style={{ textAlign: "center" }}>
                {b.earned ? "✅" : `${Math.round(b.progress * 100)}%`}
              </Text>
            </View>
          ))}
        </View>

        <Text variant="heading">ألبوم الطوابع</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {units.map((u) => (
            <View
              key={u.id}
              style={{
                width: "30%",
                aspectRatio: 1,
                borderRadius: 999,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 3,
                borderStyle: u.state === "done" ? "solid" : "dashed",
                borderColor: u.state === "done" ? colors.primary : colors.border,
                backgroundColor: u.state === "done" ? colors.primaryTint : colors.card,
              }}
            >
              <Text style={{ fontSize: 22 }}>{u.state === "done" ? "🏅" : "·"}</Text>
              <Text style={{ fontSize: 11, textAlign: "center" }} numberOfLines={2}>
                {u.stop ?? `الوحدة ${u.position}`}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
