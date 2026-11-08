import { useRef, useState } from "react";
import { ScrollView, TextInput, View, type ScrollViewInstance } from "react-native";
import { appApi } from "@/lib/api";
import { fx } from "@/lib/fx";
import { speak } from "@/lib/speech";
import { Button, colors, fonts, radius, Text } from "@/ui";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * A chat with the AI (the lesson assistant or a Hadrami role-play character). Messages go through the
 * website's app API, which redacts personal data and applies the daily limits.
 */
export function Chat({
  endpoint,
  payload,
  opening,
  placeholder,
  english,
  maxLength = 500,
}: {
  endpoint: "assistant" | "roleplay";
  payload: Record<string, unknown>;
  opening?: ChatMessage;
  placeholder: string;
  english?: boolean;
  maxLength?: number;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(opening ? [opening] : []);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const scroll = useRef<ScrollViewInstance>(null);

  async function send() {
    const content = text.trim();
    if (!content) return;
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setText("");
    setBusy(true);
    setNote(null);
    const res = await appApi<{ reply?: string; remaining?: number }>(endpoint, { ...payload, messages: next.slice(-20) });
    setBusy(false);
    if (res.reply) {
      setMessages([...next, { role: "assistant", content: res.reply }]);
      fx("pop");
      if (english) speak(res.reply);
    }
    if (res.error) setNote(res.error);
    else if (typeof res.remaining === "number") setNote(`بقي لك ${res.remaining} اليوم · الإجابات تقديرية`);
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 100);
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView ref={scroll} contentContainerStyle={{ padding: 16, gap: 10 }}>
        {messages.map((m, i) => (
          <View
            key={i}
            style={{
              alignSelf: m.role === "user" ? "flex-start" : "flex-end",
              maxWidth: "85%",
              backgroundColor: m.role === "user" ? colors.primary : colors.aiTint,
              borderRadius: radius.lg,
              padding: 12,
            }}
          >
            <Text variant={/[A-Za-z]/.test(m.content) && !/[؀-ۿ]/.test(m.content) ? "en" : "body"} style={{ color: m.role === "user" ? "#fff" : colors.ink }}>
              {m.content}
            </Text>
          </View>
        ))}
        {busy ? <Text variant="small">يكتب…</Text> : null}
      </ScrollView>
      {note ? (
        <Text variant="small" style={{ paddingHorizontal: 16 }}>
          {note}
        </Text>
      ) : null}
      <View style={{ flexDirection: "row", gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.card }}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={placeholder}
          placeholderTextColor="#9AA8A4"
          maxLength={maxLength}
          multiline
          accessibilityLabel={placeholder}
          style={{
            flex: 1,
            minHeight: 48,
            maxHeight: 120,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.md,
            paddingHorizontal: 12,
            fontFamily: english ? fonts.en : fonts.regular,
            fontSize: 16,
            textAlign: english ? "left" : "right",
          }}
        />
        <Button title="أرسل" disabled={!text.trim() || busy} onPress={() => void send()} />
      </View>
    </View>
  );
}
