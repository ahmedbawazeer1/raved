import { useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button, Card, colors, fonts, Header, LoadError, Loading, radius, Text } from "@/ui";

/** «تحدي صديق»: create a duel from your words, or join a friend's with its 6-character code. */
export default function DuelsScreen() {
  const q = useQuery({
    queryKey: ["duels"],
    queryFn: async () => {
      const { data } = await supabase.rpc("my_duels");
      return (data as unknown as { code: string; created_at: string; mine: boolean; players: number }[] | null) ?? [];
    },
  });
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (q.isLoading) return <Loading />;
  if (q.isError) return <LoadError onRetry={() => void q.refetch()} />;

  async function create() {
    setBusy(true);
    setError(null);
    const { data, error: e } = await supabase.rpc("create_duel");
    setBusy(false);
    if (e || !data) return setError(e?.message === "not_enough_words" ? "أكمل أول درس مفردات لتتحدى بكلماته." : "تعذر إنشاء التحدي. حاول مرة أخرى.");
    router.push(`/duel/${data as string}`);
  }
  async function join() {
    const c = code.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(c)) return setError("الرمز 6 حروف وأرقام.");
    const { data } = await supabase.rpc("get_duel", { p_code: c });
    if (!data) return setError("لم نجد تحدياً بهذا الرمز.");
    router.push(`/duel/${c}`);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top", "bottom"]}>
      <Header title="تحدي صديق" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
        <Card>
          <Text variant="heading">⚔️ تحدٍّ جديد</Text>
          <Text variant="muted">10 أسئلة من كلماتك. أرسل الرمز لصديقك، والأسرع والأدق يفوز.</Text>
          <Button title="أنشئ تحدياً" loading={busy} onPress={() => void create()} />
        </Card>
        <Card>
          <Text variant="heading">عندك رمز من صديق؟</Text>
          <TextInput
            value={code}
            onChangeText={setCode}
            autoCapitalize="characters"
            maxLength={6}
            accessibilityLabel="رمز التحدي"
            style={{
              minHeight: 48,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radius.md,
              paddingHorizontal: 12,
              fontFamily: fonts.enBold,
              fontSize: 20,
              textAlign: "center",
              letterSpacing: 4,
            }}
          />
          <Button title="ادخل التحدي" variant="secondary" onPress={() => void join()} />
        </Card>
        {error ? <Text style={{ color: colors.error }}>{error}</Text> : null}
        {q.data?.length ? <Text variant="heading">تحدياتي</Text> : null}
        {q.data?.map((d) => (
          <Pressable key={d.code} onPress={() => router.push(`/duel/${d.code}`)}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", padding: 14, borderRadius: 14, backgroundColor: colors.card }}>
              <Text variant="en" style={{ fontFamily: fonts.enBold }}>
                {d.code}
              </Text>
              <Text variant="small">
                {d.mine ? "أنشأته" : "شاركت فيه"} · {d.players} لاعب
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
