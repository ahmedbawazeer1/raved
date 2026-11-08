import { KeyboardAvoidingView, Platform } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Chat } from "@/features/ai/chat";
import { colors, Header } from "@/ui";

/** «اسأل المساعد»: answers about this lesson only, in Arabic (docs/AI_PROMPTS.md §3). */
export default function AssistantScreen() {
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top", "bottom"]}>
      <Header title="المساعد" subtitle="يشرح هذا الدرس بالعربية · تقديري" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Chat
          endpoint="assistant"
          payload={{ lessonId }}
          opening={{ role: "assistant", content: "أهلاً! اسألني عن أي شيء في هذا الدرس، وسأشرحه لك بالعربية مع أمثلة." }}
          placeholder="اكتب سؤالك…"
          maxLength={1000}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
