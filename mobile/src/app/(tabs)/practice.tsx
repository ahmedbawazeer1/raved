import { useState } from "react";
import { router } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchLearnedWords, fetchPrimaryPath } from "@shared/data/student";
import { GAME_TITLES, type GameKind, type GameWord } from "@shared/games/logic";
import { useUserId } from "@/data/student";
import { Game } from "@/features/games/game";
import { useAppConfig } from "@/lib/app-config";
import { supabase } from "@/lib/supabase";
import { Button, Card, colors, LoadError, Loading, radius, Text } from "@/ui";

const KINDS = Object.keys(GAME_TITLES) as GameKind[];

/** «التدريب»: the games hub with the words the student has learned (5 points per game per day). */
export default function PracticeScreen() {
  const userId = useUserId();
  const { on } = useAppConfig();
  const queryClient = useQueryClient();
  const q = useQuery({
    queryKey: ["learned-words", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<GameWord[]> => {
      const path = await fetchPrimaryPath(supabase, userId!);
      if (!path) return [];
      const words = await fetchLearnedWords(supabase, userId!, path.id);
      return words.map((w) => ({ id: w.id, word: w.word, meaning: w.meaningAr, example: w.exampleEn ?? "" }));
    },
  });
  const [kind, setKind] = useState<GameKind | null>(null);
  const [played, setPlayed] = useState<string | null>(null);

  if (q.isLoading) return <Loading />;
  if (q.isError) return <LoadError onRetry={() => void q.refetch()} />;
  const words = q.data ?? [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        <Text variant="title">التدريب</Text>
        {on("games") ? <Button title="🎮 ساحة رفد · خمس ألعاب ضد خصم من مستواك" onPress={() => router.push("/arena")} /> : null}
        {kind ? (
          <>
            <Game
              key={kind}
              kind={kind}
              words={words}
              onDone={async () => {
                const { data } = await supabase.rpc("record_game", { p_game: kind });
                setPlayed(typeof data === "number" ? `لعبت ${data} ألعاب اليوم · +5 قطرات للعبة الجديدة` : null);
                void queryClient.invalidateQueries({ queryKey: ["home"] });
              }}
            />
            {played ? <Text variant="muted">{played}</Text> : null}
            <Button
              title="ألعاب أخرى"
              variant="secondary"
              onPress={() => {
                setKind(null);
                setPlayed(null);
              }}
            />
          </>
        ) : !on("games") ? (
          <Card>
            <Text variant="heading">الألعاب متوقفة مؤقتاً</Text>
            <Text variant="muted">ستعود قريباً.</Text>
          </Card>
        ) : words.length < 4 ? (
          <Card>
            <Text variant="heading">الألعاب تنتظر كلماتك</Text>
            <Text variant="muted">أكمل أول درس لتلعب بكلماته. كل لعبة جديدة في اليوم تعطيك 5 قطرات.</Text>
          </Card>
        ) : (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {KINDS.map((k) => (
              <Pressable
                key={k}
                onPress={() => setKind(k)}
                accessibilityRole="button"
                accessibilityLabel={GAME_TITLES[k].title}
                style={({ pressed }) => ({
                  width: "47%",
                  minHeight: 110,
                  backgroundColor: colors.card,
                  borderRadius: radius.lg,
                  borderWidth: 1,
                  borderColor: colors.border,
                  padding: 12,
                  gap: 4,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Text style={{ fontSize: 28 }}>{GAME_TITLES[k].icon}</Text>
                <Text style={{ fontWeight: "700" }}>{GAME_TITLES[k].title}</Text>
                <Text variant="small" numberOfLines={2}>
                  {GAME_TITLES[k].hint}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
