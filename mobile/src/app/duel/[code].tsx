import { useRef, useState } from "react";
import { Pressable, ScrollView, Share, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { fx } from "@/lib/fx";
import { supabase } from "@/lib/supabase";
import { Button, Card, colors, fonts, Header, LoadError, Loading, radius, Text } from "@/ui";

interface Duel {
  code: string;
  creator: string;
  mine: boolean;
  played: boolean;
  questions: { word: string; options: string[] }[];
  players: { name: string; score: number; time_ms: number; me: boolean }[];
}

/** One duel: answer the 10 words fast; the answer key stays in the database (submit_duel grades). */
export default function DuelScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const q = useQuery({
    queryKey: ["duel", code],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_duel", { p_code: code });
      return data as unknown as Duel | null;
    },
  });
  const [index, setIndex] = useState(-1);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const started = useRef(0);

  if (q.isLoading) return <Loading />;
  if (q.isError) return <LoadError onRetry={() => void q.refetch()} />;
  const duel = q.data;
  if (!duel) return <LoadError onRetry={() => void q.refetch()} />;

  async function finish(all: Record<string, number>, elapsedMs: number) {
    const { error: e } = await supabase.rpc("submit_duel", { p_code: duel!.code, p_answers: all, p_time_ms: Math.round(elapsedMs) });
    if (e) setError(e.message === "already_played" ? "لعبت هذا التحدي من قبل." : "تعذر الحفظ. حاول مرة أخرى.");
    fx("coin");
    setIndex(-1);
    void q.refetch();
  }

  const question = index >= 0 ? duel.questions[index] : null;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top", "bottom"]}>
      <Header title={`تحدي ${duel.code}`} subtitle={`من ${duel.creator}`} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {question ? (
          <Card>
            <Text variant="small">
              {index + 1} / {duel.questions.length}
            </Text>
            <Text variant="en" style={{ fontFamily: fonts.enBold, fontSize: 26, textAlign: "center" }}>
              {question.word}
            </Text>
            {question.options.map((o, i) => (
              <Pressable
                key={i}
                onPress={() => {
                  const next = { ...answers, [String(index)]: i };
                  setAnswers(next);
                  fx("pop");
                  if (index + 1 >= duel.questions.length) void finish(next, Date.now() - started.current);
                  else setIndex(index + 1);
                }}
                style={{
                  minHeight: 48,
                  justifyContent: "center",
                  paddingHorizontal: 14,
                  borderRadius: radius.md,
                  borderWidth: 2,
                  borderColor: colors.border,
                  backgroundColor: colors.card,
                }}
              >
                <Text>{o}</Text>
              </Pressable>
            ))}
          </Card>
        ) : (
          <>
            {!duel.played ? (
              <Button
                title="ابدأ التحدي ⏱️"
                variant="accent"
                onPress={() => {
                  started.current = Date.now();
                  setAnswers({});
                  setIndex(0);
                }}
              />
            ) : null}
            <Button
              title="أرسل الرمز لصديق"
              variant="secondary"
              onPress={() => void Share.share({ message: `تحداك ${duel.creator} في رفد! افتح «تحدي صديق» وأدخل الرمز: ${duel.code}` })}
            />
            {error ? <Text style={{ color: colors.error }}>{error}</Text> : null}
            <Text variant="heading">النتائج</Text>
            {duel.players.length === 0 ? <Text variant="muted">لم يلعب أحد بعد.</Text> : null}
            {duel.players.map((p, i) => (
              <View key={i} style={{ flexDirection: "row", gap: 12, padding: 12, borderRadius: 14, backgroundColor: p.me ? colors.primaryTint : colors.card }}>
                <Text style={{ flex: 1 }}>
                  {i === 0 ? "🏆 " : ""}
                  {p.name}
                </Text>
                <Text style={{ fontWeight: "700" }}>
                  {p.score}/{duel.questions.length} · {Math.round(p.time_ms / 1000)} ث
                </Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
