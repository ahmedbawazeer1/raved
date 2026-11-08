import { useMemo, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { checkAnswer, shuffleWords } from "@shared/content/check-answer";
import type { PackageQuestion } from "@shared/content/types";
import { fx } from "@/lib/fx";
import { Button, colors, fonts, radius, Text } from "@/ui";
import { markSolved } from "./solved";

/** One in-lesson exercise, checked on the phone (unit quizzes are graded on the server). */
export function Exercise({ q, solved }: { q: PackageQuestion; solved: boolean }) {
  const [choice, setChoice] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [order, setOrder] = useState<string[]>([]);
  const [result, setResult] = useState<"right" | "wrong" | null>(solved ? "right" : null);
  const words = useMemo(() => (q.kind === "order_words" && Array.isArray(q.answer) ? shuffleWords(q.answer as string[], q.id) : []), [q]);
  const options = q.kind === "true_false" ? (q.options?.length ? q.options : ["صح", "خطأ"]) : (q.options ?? []);
  const given = q.kind === "fill_blank" ? text : q.kind === "order_words" ? order : choice;
  const ready = q.kind === "fill_blank" ? text.trim().length > 0 : q.kind === "order_words" ? order.length === words.length : choice !== null;

  function check() {
    const ok = checkAnswer(q, given);
    setResult(ok ? "right" : "wrong");
    fx(ok ? "good" : "bad");
    if (ok) markSolved(q.id);
  }

  const latin = /[A-Za-z]/.test(q.prompt);
  return (
    <View style={{ backgroundColor: colors.card, borderRadius: radius.lg, padding: 16, gap: 12, borderWidth: 1, borderColor: colors.border }}>
      <Text variant={latin ? "en" : "body"} style={{ fontFamily: latin ? fonts.enBold : fonts.semibold, fontSize: 17 }}>
        {q.prompt}
      </Text>

      {q.kind === "mcq" || q.kind === "true_false"
        ? options.map((o, i) => (
            <Pressable
              key={i}
              accessibilityRole="radio"
              accessibilityState={{ checked: choice === i }}
              onPress={() => {
                setChoice(i);
                setResult(null);
              }}
              style={{
                minHeight: 48,
                justifyContent: "center",
                paddingHorizontal: 14,
                borderRadius: radius.md,
                borderWidth: 2,
                borderColor: choice === i ? colors.primary : colors.border,
                backgroundColor: choice === i ? colors.primaryTint : colors.card,
              }}
            >
              <Text variant={/[A-Za-z]/.test(o) ? "en" : "body"}>{o}</Text>
            </Pressable>
          ))
        : null}

      {q.kind === "fill_blank" ? (
        <TextInput
          value={text}
          onChangeText={(t) => {
            setText(t);
            setResult(null);
          }}
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

      {q.kind === "order_words" ? (
        <View style={{ gap: 10 }}>
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
            {order.map((w, i) => (
              <Pressable key={`${w}-${i}`} onPress={() => setOrder(order.filter((_, j) => j !== i))} style={chip(colors.primaryTint)}>
                <Text variant="en">{w}</Text>
              </Pressable>
            ))}
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, direction: "ltr" }}>
            {words.map((w, i) => {
              const used = order.filter((x) => x === w).length >= words.slice(0, i + 1).filter((x) => x === w).length;
              return (
                <Pressable key={`${w}-${i}`} disabled={used} onPress={() => setOrder([...order, w])} style={[chip(colors.card), { opacity: used ? 0.3 : 1 }]}>
                  <Text variant="en">{w}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {result === "right" ? (
        <View style={{ backgroundColor: colors.successTint, borderRadius: radius.md, padding: 12, gap: 4 }}>
          <Text style={{ color: colors.success, fontFamily: fonts.bold }}>إجابة صحيحة ✅</Text>
          <Text variant="muted">{q.explanation_ar}</Text>
        </View>
      ) : result === "wrong" ? (
        <View style={{ backgroundColor: colors.errorTint, borderRadius: radius.md, padding: 12, gap: 4 }}>
          <Text style={{ color: colors.error, fontFamily: fonts.bold }}>ليست صحيحة، حاول مرة أخرى</Text>
          <Text variant="muted">{q.explanation_ar}</Text>
        </View>
      ) : null}
      {result !== "right" ? <Button title="تحقق من الإجابة" disabled={!ready} onPress={check} /> : null}
    </View>
  );
}

function chip(bg: string) {
  return {
    minHeight: 40,
    paddingHorizontal: 12,
    justifyContent: "center" as const,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: bg,
  };
}
