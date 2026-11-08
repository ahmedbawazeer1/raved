import { useState } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button, Card, colors, Header, LoadError, Loading, Text } from "@/ui";

interface League {
  rows: { rank: number; xp: number; me: boolean; name: string }[];
  me: { rank: number; xp: number; joined: boolean } | null;
}

/** Weekly league: opt-in, first name and initial only (weekly_league()). */
export default function LeagueScreen() {
  const [scope, setScope] = useState<"all" | "governorate">("all");
  const q = useQuery({
    queryKey: ["league", scope],
    queryFn: async () => {
      const { data } = await supabase.rpc("weekly_league", { p_scope: scope });
      return (data as unknown as League | null) ?? { rows: [], me: null };
    },
  });
  if (q.isLoading) return <Loading />;
  if (q.isError || !q.data) return <LoadError onRetry={() => void q.refetch()} />;
  const joined = q.data.me?.joined ?? false;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top", "bottom"]}>
      <Header title="الدوري الأسبوعي" subtitle="يبدأ أسبوع جديد كل سبت" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {!joined ? (
          <Card tone="warning">
            <Text variant="heading">انضم للدوري</Text>
            <Text variant="muted">يظهر اسمك الأول وأول حرف من اسم عائلتك فقط. تستطيع الخروج متى شئت.</Text>
            <Button
              title="انضم"
              variant="accent"
              onPress={async () => {
                await supabase.rpc("set_league_opt_in", { p_join: true });
                void q.refetch();
              }}
            />
          </Card>
        ) : null}
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Button title="كل اليمن" variant={scope === "all" ? "primary" : "secondary"} onPress={() => setScope("all")} />
          </View>
          <View style={{ flex: 1 }}>
            <Button title="محافظتي" variant={scope === "governorate" ? "primary" : "secondary"} onPress={() => setScope("governorate")} />
          </View>
        </View>
        {q.data.rows.map((r) => (
          <View
            key={`${r.rank}-${r.name}`}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              padding: 12,
              borderRadius: 14,
              backgroundColor: r.me ? colors.primaryTint : colors.card,
            }}
          >
            <Text style={{ fontWeight: "700", width: 32 }}>{r.rank <= 3 ? ["🥇", "🥈", "🥉"][r.rank - 1] : r.rank}</Text>
            <Text style={{ flex: 1 }}>{r.name}</Text>
            <Text style={{ fontWeight: "700" }}>⭐ {r.xp}</Text>
          </View>
        ))}
        {joined ? (
          <Button
            title="الخروج من الدوري"
            variant="secondary"
            onPress={async () => {
              await supabase.rpc("set_league_opt_in", { p_join: false });
              void q.refetch();
            }}
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
