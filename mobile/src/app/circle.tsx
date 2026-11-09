import { useState } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { CIRCLE_NAMES, circleSchema } from "@shared/gamification/league";
import { supabase } from "@/lib/supabase";
import { Button, Card, Choice, colors, Face, Field, Header, LoadError, Loading, ProgressBar, Text } from "@/ui";

const MESSAGES: [string, string][] = [
  ["not_found", "لم نجد حلقة بهذا الرمز."],
  ["circle_full", "هذه الحلقة ممتلئة (١٠ أعضاء)."],
  ["already_in_circle", "أنت في حلقة الآن."],
];
const message = (e: string) => MESSAGES.find(([k]) => e.includes(k))?.[1] ?? "حدث خطأ. حاول مرة أخرى.";

/** Friend circle: a weekly team goal that fills like a lake, no ranking inside. */
export default function CircleScreen() {
  const q = useQuery({
    queryKey: ["circle"],
    queryFn: async () => {
      const { data } = await supabase.rpc("my_circle");
      const p = circleSchema.safeParse(data);
      return p.success ? p.data : null;
    },
  });
  const [name, setName] = useState<string>(CIRCLE_NAMES[0]);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  if (q.isLoading) return <Loading />;
  if (q.isError) return <LoadError onRetry={() => void q.refetch()} />;
  const c = q.data;
  const run = async (fn: () => PromiseLike<{ error: { message: string } | null }>) => {
    setError(null);
    const { error: e } = await fn();
    if (e) setError(message(e.message));
    void q.refetch();
  };
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top", "bottom"]}>
      <Header title="حلقة الأصدقاء" subtitle="هدف أسبوعي مشترك يمتلئ كبحيرة" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
        {error ? (
          <Card tone="warning">
            <Text accessibilityRole="alert">{error}</Text>
          </Card>
        ) : null}
        {c ? (
          <>
            <Card>
              <Text variant="heading">{c.name}</Text>
              <Text>هدف الأسبوع: نملأ البحيرة</Text>
              <ProgressBar value={c.total} max={c.goal} color={colors.primary} track={colors.primaryTint} />
              <Text variant="small">
                {c.total} من {c.goal} قطرة{c.total >= c.goal ? " · امتلأت البحيرة! 🎉" : ""}
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
                {c.members.map((m, i) => (
                  <View key={i} style={{ alignItems: "center", width: 64 }}>
                    <Face avatar={m.avatar} size={42} />
                    <Text variant="small" style={{ textAlign: "center", fontWeight: m.me ? "700" : "400" }}>
                      {m.name}
                    </Text>
                    {m.active ? <Text variant="small">💧</Text> : null}
                  </View>
                ))}
              </View>
            </Card>
            <Card tone="primary">
              <Text>رمز الحلقة لأصدقائك (حتى ١٠ أعضاء):</Text>
              <Text variant="en" selectable style={{ fontSize: 28, lineHeight: 40, letterSpacing: 6, textAlign: "center", fontWeight: "700" }}>
                {c.code}
              </Text>
            </Card>
            <Button title="اخرج من الحلقة" variant="secondary" onPress={() => void run(() => supabase.rpc("leave_circle"))} />
          </>
        ) : (
          <>
            <Card>
              <Field label="عندك رمز من صديق؟" value={code} onChangeText={setCode} autoCapitalize="characters" maxLength={6} />
              <Button title="انضم" disabled={code.trim().length !== 6} onPress={() => void run(() => supabase.rpc("join_circle", { p_code: code.trim() }))} />
            </Card>
            <Card>
              <Choice label="حلقة جديدة: اختر اسماً" options={CIRCLE_NAMES.map((n) => ({ value: n, label: n }))} value={name} onChange={setName} />
              <Button title="أنشئ الحلقة" onPress={() => void run(() => supabase.rpc("create_circle", { p_name: name }))} />
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
