import { Pressable, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { ARENA_GAMES, GAME_INFO } from "@shared/arena/games";
import { supabase } from "@/lib/supabase";
import { Button, Card, colors, Header, radius, Text } from "@/ui";

/** «ساحة رفد»: the five games, drops earned today (5 per game per day). */
export default function ArenaScreen() {
  const q = useQuery({
    queryKey: ["arena-today"],
    queryFn: async () => ((await supabase.rpc("arena_today")).data ?? {}) as Record<string, number>,
  });
  const today = q.data ?? {};
  const drops = ARENA_GAMES.reduce((n, g) => n + (today[g] ?? 0), 0);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top", "bottom"]}>
      <Header title="ساحة رفد" subtitle="الأسئلة من الوحدات التي درستها فقط" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Card tone="primary">
          <Text variant="heading">
            قطرات الألعاب اليوم: {drops}/{ARENA_GAMES.length * 5}
          </Text>
          <Text variant="small">٥ قطرات لكل لعبة تنجح فيها بنصف الإجابات على الأقل</Text>
        </Card>
        {ARENA_GAMES.map((g) => (
          <Pressable
            key={g}
            accessibilityRole="button"
            onPress={() => router.push(`/arena/${g}`)}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              padding: 14,
              borderRadius: radius.lg,
              borderWidth: 2,
              borderBottomWidth: pressed ? 2 : 5,
              borderColor: colors.border,
              backgroundColor: colors.card,
            })}
          >
            <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: GAME_INFO[g].colour }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "700" }}>{GAME_INFO[g].name}</Text>
              <Text variant="small">{GAME_INFO[g].tagline}</Text>
              <Text variant="small" style={{ color: today[g] ? colors.success : colors.warning }}>
                {today[g] ? "✓ أخذت قطراتها اليوم" : "+٥ قطرات"}
              </Text>
            </View>
          </Pressable>
        ))}
        <Button title="⚔️ تحدَّ صديقاً" variant="secondary" onPress={() => router.push("/duel")} />
        <Button title="👥 حلقتي" variant="secondary" onPress={() => router.push("/circle")} />
      </ScrollView>
    </SafeAreaView>
  );
}
