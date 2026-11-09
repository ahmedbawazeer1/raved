import { Fragment } from "react";
import { ScrollView, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { championsSchema, CHAMPION_TITLES, LEAGUE_TIERS, parseLeague, PROMOTE, resultText, tierOf, timeLeft, zoneOf } from "@shared/gamification/league";
import { supabase } from "@/lib/supabase";
import { Button, Card, colors, Face, Header, LoadError, Loading, Row, Text, TierBadge } from "@/ui";

/** The water league: six tiers, groups of 20, results on Friday (weekly_league()). */
export default function LeagueScreen() {
  const q = useQuery({
    queryKey: ["league"],
    queryFn: async () => {
      const [{ data }, { data: champs }] = await Promise.all([supabase.rpc("weekly_league", { p_scope: "all" }), supabase.rpc("monthly_champions")]);
      const c = championsSchema.safeParse(champs);
      return { league: parseLeague(data), champions: c.success ? c.data : null };
    },
  });
  if (q.isLoading) return <Loading />;
  if (q.isError || !q.data) return <LoadError onRetry={() => void q.refetch()} />;
  const { league, champions } = q.data;
  const joined = league.me?.joined ?? false;
  const tier = league.me?.tier ?? league.tier ?? 0;
  const size = league.rows.length;
  const setJoin = async (on: boolean) => {
    await supabase.rpc("set_league_opt_in", { p_join: on });
    void q.refetch();
  };
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top", "bottom"]}>
      <Header title="الدوري" subtitle="مجموعة من ٢٠ طالباً · النتائج يوم الجمعة" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {league.result ? (
          <Card tone={league.result.outcome === "up" ? "primary" : "plain"} style={{ alignItems: "center" }}>
            <Text variant="small">إعلان الجمعة</Text>
            <TierBadge tier={league.result.to_tier} size={64} />
            <Text variant="heading">{resultText(league.result).title}</Text>
            <Text variant="muted">{resultText(league.result).body}</Text>
            <Button
              title="متابعة"
              onPress={async () => {
                await supabase.rpc("league_result_seen");
                void q.refetch();
              }}
            />
          </Card>
        ) : null}
        <Card tone="primary">
          <Row gap={12}>
            <TierBadge tier={tier} size={56} />
            <View style={{ flex: 1 }}>
              <Text variant="heading">دوري «{tierOf(tier).name}»</Text>
              <Text variant="small">
                {tier < 5 ? `أول ${PROMOTE} يصعدون إلى «${tierOf(tier + 1).name}»` : "أعلى دوري!"} · باقي {timeLeft(league.ends_at)}
              </Text>
            </View>
            {league.me?.rank ? <Text variant="title">{league.me.rank}</Text> : null}
          </Row>
        </Card>
        <Row gap={4}>
          {LEAGUE_TIERS.map((t) => (
            <View key={t.id} style={{ flex: 1, alignItems: "center" }}>
              <TierBadge tier={t.id} size={t.id === tier ? 38 : 28} locked={t.id > tier} />
              <Text variant="small" style={{ fontWeight: t.id === tier ? "700" : "400" }}>
                {t.name}
              </Text>
            </View>
          ))}
        </Row>
        {joined ? (
          <Card>
            {size <= 1 ? <Text variant="small">مجموعتك تمتلئ مع كل طالب يجمع قطرات هذا الأسبوع.</Text> : null}
            {league.rows.map((r) => {
              const zone = zoneOf(r.rank, size, tier);
              const next = league.rows.find((x) => x.rank === r.rank + 1);
              return (
                <Fragment key={`${r.rank}-${r.name}`}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                      padding: 8,
                      borderRadius: 14,
                      backgroundColor: r.me ? colors.primaryTint : "transparent",
                    }}
                  >
                    <Text style={{ width: 28, fontWeight: "700", color: zone === "up" ? colors.success : zone === "down" ? colors.error : colors.ink }}>
                      {r.rank}
                    </Text>
                    <Face avatar={r.avatar} size={34} />
                    <Text style={{ flex: 1, fontWeight: r.me ? "700" : "400" }}>{r.name}</Text>
                    <Text style={{ fontWeight: "700" }}>{r.xp} قطرة</Text>
                  </View>
                  {zone === "up" && next && zoneOf(next.rank, size, tier) !== "up" ? (
                    <Text variant="small" style={{ color: colors.success, textAlign: "center" }}>
                      — منطقة الصعود —
                    </Text>
                  ) : null}
                  {zone !== "down" && next && zoneOf(next.rank, size, tier) === "down" ? (
                    <Text variant="small" style={{ color: colors.error, textAlign: "center" }}>
                      — منطقة النزول —
                    </Text>
                  ) : null}
                </Fragment>
              );
            })}
          </Card>
        ) : (
          <Card tone="warning">
            <Text variant="heading">أنت خارج الدوري</Text>
            <Text variant="muted">لا يظهر اسمك ولا الأفتار لأحد. ارجع متى شئت.</Text>
            <Button title="ارجع إلى الدوري" variant="accent" onPress={() => void setJoin(true)} />
          </Card>
        )}
        <Button title="👥 حلقة الأصدقاء" variant="secondary" onPress={() => router.push("/circle")} />
        <Text variant="heading">أبطال الشهر الماضي</Text>
        {champions && Object.keys(champions.levels).length ? (
          Object.entries(champions.levels).map(([level, titles]) => (
            <Card key={level}>
              <Text variant="en" style={{ fontWeight: "700" }}>
                {level}
              </Text>
              {(["drops", "watering", "arena"] as const).map((k) =>
                titles[k] ? (
                  <Row key={k}>
                    <Face avatar={titles[k]?.avatar} size={30} />
                    <Text style={{ flex: 1 }}>
                      {CHAMPION_TITLES[k].title}: {titles[k]?.name}
                    </Text>
                    <Text variant="small">
                      {titles[k]?.value} {CHAMPION_TITLES[k].unit}
                    </Text>
                  </Row>
                ) : null,
              )}
            </Card>
          ))
        ) : (
          <Text variant="small">يُتوَّج الأبطال في أول يوم من كل شهر: أكثر قطرات، أطول سقاية، وبطل الساحة.</Text>
        )}
        {joined ? <Button title="اخرج من الدوري" variant="secondary" onPress={() => void setJoin(false)} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}
