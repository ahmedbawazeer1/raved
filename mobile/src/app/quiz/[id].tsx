import { useMemo, useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Crypto from "expo-crypto";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { GUARDIAN_VIEWBOX, guardianFor, guardianMarkup } from "@shared/art/guardians";
import { fx } from "@/lib/fx";
import { supabase } from "@/lib/supabase";
import { Art, Button, Card, colors, fonts, Header, LoadError, Loading, radius, Text } from "@/ui";

interface QuestionView {
  id: string;
  kind: "mcq" | "fill_blank" | "true_false" | "order_words";
  prompt: string;
  options?: string[] | null;
  words?: string[] | null;
}
interface ResultItem {
  id: string;
  prompt: string;
  given: unknown;
  answer: unknown;
  correct: boolean;
  explanation_ar: string;
  options: string[] | null;
}
type Answer = number | string | string[] | undefined;

const show = (v: unknown, options: string[] | null) =>
  typeof v === "number" && options ? (options[v] ?? "—") : Array.isArray(v) ? v.join(" ") : v == null || v === "" ? "—" : String(v);

/**
 * The unit quiz as a battle with the stop's guardian. Questions come without answers (get_quiz) and the
 * server grades them (submit_quiz): the phone never knows the right answers before sending.
 */
export default function QuizScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const q = useQuery({
    queryKey: ["quiz", id],
    queryFn: async () => {
      const [quiz, meta, open] = await Promise.all([
        supabase.rpc("get_quiz", { p_quiz_id: id }),
        supabase.from("quizzes").select("pass_percent, units(id, position, levels(code))").eq("id", id).maybeSingle(),
        supabase.rpc("my_quiz_open", { p_quiz_id: id }),
      ]);
      if (quiz.error) throw quiz.error;
      return {
        questions: ((quiz.data as unknown as { questions: QuestionView[] } | null)?.questions ?? []) as QuestionView[],
        unit: meta.data?.units ?? null,
        pass: meta.data?.pass_percent ?? 70,
        open: Boolean(open.data),
      };
    },
  });
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ correct: number; total: number; score: number; passed: boolean; results: ResultItem[] } | null>(null);
  const clientId = useMemo(() => Crypto.randomUUID(), []);

  if (q.isLoading) return <Loading />;
  if (q.isError || !q.data) return <LoadError onRetry={() => void q.refetch()} />;
  const { questions, unit, open, pass } = q.data;
  const guardian = guardianFor(unit?.levels?.code);
  const stopName = `الوحدة ${unit?.position ?? ""}`;
  const back = () => (unit ? router.replace(`/unit/${unit.id}`) : router.replace("/today"));

  if (!open) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <Header title="اختبار الوحدة" />
        <View style={{ padding: 24, gap: 12, alignItems: "center" }}>
          <Text style={{ fontSize: 48 }}>🔒</Text>
          <Text variant="heading">الاختبار مقفل</Text>
          <Text variant="muted" style={{ textAlign: "center" }}>
            أكمل كل دروس الوحدة أولاً، ثم يُفتح اختبار الوحدة.
          </Text>
          <Button title="إلى الوحدة" onPress={back} />
        </View>
      </SafeAreaView>
    );
  }

  if (result) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top", "bottom"]}>
        <Header title="نتيجة المعركة" />
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
          <View style={{ alignItems: "center", gap: 6 }}>
            <Art markup={guardianMarkup(guardian.id, result.passed)} viewBox={GUARDIAN_VIEWBOX} width={150} height={175} />
            <Text variant="heading" style={{ textAlign: "center" }}>
              {result.passed ? `هزمت ${guardian.name}! طابع ${stopName} لك 🏅` : `${guardian.name} صمد هذه المرة`}
            </Text>
            <Text variant="muted">
              {result.correct} ضربات صحيحة من {result.total}
            </Text>
            {!result.passed ? <Text variant="muted">تحتاج {pass}% للنجاح. راجع الأخطاء وحاول مرة أخرى.</Text> : null}
          </View>
          {result.results.map((r) => (
            <Card key={r.id}>
              <Text style={{ fontFamily: fonts.semibold }}>
                {r.correct ? "✅" : "❌"} {r.prompt}
              </Text>
              {!r.correct ? (
                <>
                  <Text variant="muted">إجابتك: {show(r.given, r.options)}</Text>
                  <Text style={{ color: colors.success }}>الصحيح: {show(r.answer, r.options)}</Text>
                  <Text variant="small">{r.explanation_ar}</Text>
                </>
              ) : null}
            </Card>
          ))}
          <Button title={result.passed ? "تابع الرحلة" : "إلى الوحدة"} onPress={() => (result.passed ? router.replace("/today") : back())} />
          {!result.passed ? (
            <Button
              title="حاول مرة أخرى"
              variant="secondary"
              onPress={() => {
                setResult(null);
                setAnswers({});
                setIndex(0);
              }}
            />
          ) : null}
        </ScrollView>
      </SafeAreaView>
    );
  }

  const question = questions[index];
  if (!question) return <LoadError onRetry={() => void q.refetch()} />;
  const value = answers[question.id];
  const answered = value !== undefined && value !== "" && !(Array.isArray(value) && value.length === 0);
  const last = index === questions.length - 1;
  const set = (v: Answer) => setAnswers((a) => ({ ...a, [question.id]: v }));

  async function submit() {
    setBusy(true);
    setError(null);
    const { data: attemptId, error: e } = await supabase.rpc("submit_quiz", {
      p_quiz_id: id,
      p_answers: answers as never,
      p_client_id: clientId,
      p_client_created_at: new Date().toISOString(),
    });
    if (e || !attemptId) {
      setBusy(false);
      setError("تعذر إرسال الإجابات. تحقق من الاتصال وحاول مرة أخرى.");
      return;
    }
    const { data: attempt } = await supabase
      .from("quiz_attempts")
      .select("correct, total, score, passed, results")
      .eq("id", attemptId as string)
      .maybeSingle();
    setBusy(false);
    if (attempt) {
      fx(attempt.passed ? "coin" : "bad");
      setResult({ ...attempt, results: (attempt.results as unknown as ResultItem[]) ?? [] });
      void queryClient.invalidateQueries();
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top", "bottom"]}>
      <Header title={`معركة ${stopName}`} subtitle={`السؤال ${index + 1} من ${questions.length}`} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: "center" }}>
          <Art markup={guardianMarkup(guardian.id)} viewBox={GUARDIAN_VIEWBOX} width={110} height={128} />
          <Text variant="small">{guardian.name}</Text>
        </View>
        <Card>
          <Text variant={/[A-Za-z]/.test(question.prompt) ? "en" : "body"} style={{ fontSize: 18 }}>
            {question.prompt}
          </Text>
          {question.kind === "mcq" || question.kind === "true_false"
            ? (question.options ?? (question.kind === "true_false" ? ["صح", "خطأ"] : [])).map((o, i) => (
                <Pressable
                  key={i}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: value === i }}
                  onPress={() => {
                    set(i);
                    fx("pop");
                  }}
                  style={{
                    minHeight: 48,
                    justifyContent: "center",
                    paddingHorizontal: 14,
                    borderRadius: radius.md,
                    borderWidth: 2,
                    borderColor: value === i ? colors.primary : colors.border,
                    backgroundColor: value === i ? colors.primaryTint : colors.card,
                  }}
                >
                  <Text variant={/[A-Za-z]/.test(o) ? "en" : "body"}>{o}</Text>
                </Pressable>
              ))
            : null}
          {question.kind === "fill_blank" ? (
            <TextInput
              value={typeof value === "string" ? value : ""}
              onChangeText={set}
              accessibilityLabel="إجابتك"
              autoCapitalize="none"
              autoCorrect={false}
              style={{
                minHeight: 48,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radius.md,
                paddingHorizontal: 12,
                fontFamily: fonts.en,
                fontSize: 17,
                textAlign: "left",
              }}
            />
          ) : null}
          {question.kind === "order_words" ? (
            <View style={{ gap: 8 }}>
              <View
                style={{
                  minHeight: 48,
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 6,
                  padding: 8,
                  borderRadius: radius.md,
                  backgroundColor: colors.bg,
                  direction: "ltr",
                }}
              >
                {(Array.isArray(value) ? value : []).map((w, i) => (
                  <Pressable
                    key={`${w}-${i}`}
                    onPress={() => set((value as string[]).filter((_, j) => j !== i))}
                    style={{ padding: 10, borderRadius: 10, backgroundColor: colors.primaryTint }}
                  >
                    <Text variant="en">{w}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, direction: "ltr" }}>
                {(question.words ?? []).map((w, i) => {
                  const picked = Array.isArray(value) ? value : [];
                  const used = picked.filter((x) => x === w).length >= (question.words ?? []).slice(0, i + 1).filter((x) => x === w).length;
                  return (
                    <Pressable
                      key={`${w}-${i}`}
                      disabled={used}
                      onPress={() => set([...picked, w])}
                      style={{ padding: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.border, opacity: used ? 0.3 : 1 }}
                    >
                      <Text variant="en">{w}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}
        </Card>
        {error ? <Text style={{ color: colors.error }}>{error}</Text> : null}
        <View style={{ flexDirection: "row", gap: 8 }}>
          {index > 0 ? (
            <View style={{ flex: 1 }}>
              <Button title="السابق" variant="secondary" onPress={() => setIndex(index - 1)} />
            </View>
          ) : null}
          <View style={{ flex: 2 }}>
            <Button
              title={last ? "اضرب الضربة الأخيرة ⚔️" : "التالي"}
              disabled={!answered}
              loading={busy}
              onPress={() => (last ? void submit() : setIndex(index + 1))}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
