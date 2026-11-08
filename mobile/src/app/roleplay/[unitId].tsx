import { KeyboardAvoidingView, Platform } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Chat } from "@/features/ai/chat";
import { supabase } from "@/lib/supabase";
import { colors, Header, LoadError, Loading } from "@/ui";

/** Role-play in English with the unit's Hadrami character (docs/AI_PROMPTS.md §6). */
export default function RoleplayScreen() {
  const { unitId } = useLocalSearchParams<{ unitId: string }>();
  const q = useQuery({
    queryKey: ["roleplay", unitId],
    queryFn: async () => {
      const { data } = await supabase.from("units").select("roleplay").eq("id", unitId).maybeSingle();
      return (data?.roleplay as { character_ar?: string; opening_en?: string } | null) ?? null;
    },
  });
  if (q.isLoading) return <Loading />;
  if (q.isError) return <LoadError onRetry={() => void q.refetch()} />;
  const r = q.data;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top", "bottom"]}>
      <Header title={r?.character_ar ? `تحدث مع ${r.character_ar}` : "محادثة"} subtitle="بالإنجليزية · +5 نقاط · تقديري" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Chat
          endpoint="roleplay"
          payload={{ unitId }}
          opening={r?.opening_en ? { role: "assistant", content: r.opening_en } : undefined}
          placeholder="Write in English…"
          english
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
