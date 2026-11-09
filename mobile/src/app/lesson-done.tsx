import { ScrollView, View } from "react-native";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { fetchActivityDates, fetchXpRows } from "@shared/data/student";
import { badges, statsFromXp } from "@shared/gamification/xp";
import { parseLeague } from "@shared/gamification/league";
import { yemenDate } from "@shared/student/stats";
import { watering } from "@shared/student/watering";
import { useUserId } from "@/data/student";
import { supabase } from "@/lib/supabase";
import { Button, Card, colors, Loading, RafedArt, Row, Text } from "@/ui";

const DAYS = ["س", "ح", "ن", "ث", "ر", "خ", "ج"];

/** After a lesson: drops earned today, this week's watering, the league rank, new badges; then on. */
export default function LessonDoneScreen() {
  const { next } = useLocalSearchParams<{ next?: string }>();
  const userId = useUserId();
  const q = useQuery({
    queryKey: ["lesson-done", userId],
    enabled: !!userId,
    queryFn: async () => {
      const [xp, activity, { data: league }] = await Promise.all([
        fetchXpRows(supabase, userId!),
        fetchActivityDates(supabase, userId!),
        supabase.rpc("weekly_league", { p_scope: "all" }),
      ]);
      const w = watering(activity);
      const today = yemenDate(new Date());
      return {
        earned: xp.filter((r) => yemenDate(r.created_at) === today).reduce((s, r) => s + r.points, 0),
        total: xp.reduce((s, r) => s + r.points, 0),
        water: w,
        league: parseLeague(league).me,
        badges: badges(statsFromXp(xp, w.days)).filter((b) => b.earned),
      };
    },
  });
  const go = () => router.replace((next && next.startsWith("/") ? next : "/today") as Href);
  if (q.isLoading || !q.data) return <Loading />;
  const d = q.data;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14, alignItems: "stretch" }}>
        <View style={{ alignItems: "center", gap: 6 }}>
          <RafedArt size={120} mood="happy" />
          <Text variant="title" accessibilityRole="header">
            أحسنت!
          </Text>
          <Text variant="muted">سقيت رافد اليوم</Text>
        </View>
        <Row>
          <Card tone="primary" style={{ flex: 1, alignItems: "center" }}>
            <Text variant="small">قطرات اليوم</Text>
            <Text variant="title" style={{ color: colors.primary }}>
              +{d.earned}
            </Text>
          </Card>
          <Card style={{ flex: 1, alignItems: "center" }}>
            <Text variant="small">المجموع</Text>
            <Text variant="title">{d.total}</Text>
          </Card>
          {d.league?.joined && d.league.rank ? (
            <Card style={{ flex: 1, alignItems: "center" }}>
              <Text variant="small">ترتيبك</Text>
              <Text variant="title">{d.league.rank}</Text>
            </Card>
          ) : null}
        </Row>
        <Card>
          <Text style={{ fontWeight: "700" }}>السقاية: {d.water.days} يوم</Text>
          <Row gap={6}>
            {d.water.week.map((on, i) => (
              <View key={i} style={{ flex: 1, alignItems: "center", gap: 2 }}>
                <Text style={{ fontSize: 20 }}>{on ? "💧" : i === 6 ? "🌙" : "○"}</Text>
                <Text variant="small" style={{ fontWeight: i === d.water.todayIndex ? "700" : "400" }}>
                  {DAYS[i]}
                </Text>
              </View>
            ))}
          </Row>
        </Card>
        {d.badges.length ? (
          <Card tone="warning">
            <Text style={{ fontWeight: "700" }}>أوسمتك</Text>
            <Text variant="small">{d.badges.map((b) => `${b.icon} ${b.title}`).join("  ·  ")}</Text>
          </Card>
        ) : null}
        <Button title="متابعة" onPress={go} />
      </ScrollView>
    </SafeAreaView>
  );
}
