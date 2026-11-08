import { useState } from "react";
import { Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Crypto from "expo-crypto";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchPrimaryPath, fetchVocabDeck } from "@shared/data/student";
import { saveReviews } from "@shared/data/vocab";
import type { Grade } from "@shared/srs";
import { useUserId } from "@/data/student";
import { fx } from "@/lib/fx";
import { speak } from "@/lib/speech";
import { supabase } from "@/lib/supabase";
import { Button, Card, colors, fonts, LoadError, Loading, radius, Text } from "@/ui";

const GRADE_BUTTONS: { grade: Grade; label: string; variant: "secondary" | "primary" | "accent" }[] = [
  { grade: "again", label: "نسيتها", variant: "secondary" },
  { grade: "hard", label: "صعبة", variant: "accent" },
  { grade: "good", label: "عرفتها", variant: "primary" },
];

/** «المفردات»: today's spaced-repetition review (same deck and scheduling as the website). */
export default function VocabScreen() {
  const userId = useUserId();
  const queryClient = useQueryClient();
  const q = useQuery({
    queryKey: ["vocab", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const path = await fetchPrimaryPath(supabase, userId!);
      return path ? fetchVocabDeck(supabase, userId!, path.id) : null;
    },
  });
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [saving, setSaving] = useState(false);

  if (q.isLoading) return <Loading />;
  if (q.isError) return <LoadError onRetry={() => void q.refetch()} />;
  const cards = q.data?.cards ?? [];
  const card = cards[index];

  async function grade(g: Grade) {
    if (!card || !userId) return;
    setSaving(true);
    await saveReviews(supabase, userId, [{ id: Crypto.randomUUID(), vocabItemId: card.id, grade: g, reviewedAt: new Date().toISOString() }]);
    setSaving(false);
    fx(g === "good" ? "good" : "pop");
    setFlipped(false);
    setIndex(index + 1);
    void queryClient.invalidateQueries({ queryKey: ["home"] });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <View style={{ padding: 16, gap: 16, flex: 1 }}>
        <Text variant="title">المفردات</Text>
        {!cards.length ? (
          <Card>
            <Text variant="heading">لا كلمات للمراجعة الآن</Text>
            <Text variant="muted">أكمل دروساً جديدة لتظهر كلماتها هنا، وتعود كل كلمة في الوقت المناسب لتثبت في ذاكرتك.</Text>
          </Card>
        ) : !card ? (
          <Card tone="primary">
            <Text variant="heading">أنهيت مراجعة اليوم 🎉</Text>
            <Text variant="muted">راجعت {cards.length} كلمة. عد غداً لكلمات جديدة.</Text>
            <Button
              title="ابدأ من جديد"
              variant="secondary"
              onPress={() => {
                setIndex(0);
                void q.refetch();
              }}
            />
          </Card>
        ) : (
          <>
            <Text variant="muted">
              الكلمة {index + 1} من {cards.length}
            </Text>
            <Pressable
              onPress={() => {
                setFlipped(!flipped);
                if (!flipped) speak(card.word);
              }}
              accessibilityRole="button"
              accessibilityLabel={flipped ? card.meaningAr : `اقلب البطاقة: ${card.word}`}
              style={{
                minHeight: 240,
                borderRadius: radius.xl,
                backgroundColor: flipped ? colors.card : colors.primary,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: "center",
                justifyContent: "center",
                padding: 20,
                gap: 8,
              }}
            >
              <Text variant="en" style={{ fontFamily: fonts.enBold, fontSize: 32, textAlign: "center", color: flipped ? colors.ink : "#fff" }}>
                {card.word}
              </Text>
              {card.ipa ? (
                <Text variant="en" style={{ textAlign: "center", color: flipped ? colors.muted : colors.primaryTint }}>
                  {card.ipa}
                </Text>
              ) : null}
              {flipped ? (
                <>
                  <Text variant="heading" style={{ textAlign: "center" }}>
                    {card.meaningAr}
                  </Text>
                  {card.exampleEn ? (
                    <Text variant="en" style={{ textAlign: "center", color: colors.muted }}>
                      {card.exampleEn}
                    </Text>
                  ) : null}
                  {card.exampleAr ? (
                    <Text variant="muted" style={{ textAlign: "center" }}>
                      {card.exampleAr}
                    </Text>
                  ) : null}
                </>
              ) : (
                <Text style={{ color: colors.primaryTint, textAlign: "center" }}>اضغط لترى المعنى</Text>
              )}
            </Pressable>
            {flipped ? (
              <View style={{ flexDirection: "row", gap: 8 }}>
                {GRADE_BUTTONS.map((b) => (
                  <View key={b.grade} style={{ flex: 1 }}>
                    <Button title={b.label} variant={b.variant} disabled={saving} onPress={() => void grade(b.grade)} />
                  </View>
                ))}
              </View>
            ) : (
              <Button title="🔊 استمع" variant="secondary" onPress={() => speak(card.word)} />
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
