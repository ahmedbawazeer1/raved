import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { finishGoogle } from "@/lib/google";
import { Button, colors, Screen, Text } from "@/ui";

/** Where Google sign-in returns (raved://auth-callback?code=…): finish signing in, then open the app. */
export default function AuthCallback() {
  const params = useLocalSearchParams<{ code?: string; error_description?: string }>();
  const [failed, setError] = useState<string | null>(null);
  const error = params.error_description ? "تم إلغاء تسجيل Google أو رفضه. حاول مرة أخرى." : failed;

  useEffect(() => {
    if (params.error_description) return;
    const q = new URLSearchParams();
    if (params.code) q.set("code", params.code);
    void finishGoogle(`raved://auth-callback?${q.toString()}`).then((e) => {
      if (e) setError(e);
      else router.replace("/");
    });
  }, [params.code, params.error_description]);

  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 16, padding: 24 }}>
        {error ? (
          <>
            <Text style={{ color: colors.error, textAlign: "center" }}>{error}</Text>
            <Button title="العودة لتسجيل الدخول" onPress={() => router.replace("/login")} />
          </>
        ) : (
          <>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text>جارٍ إكمال تسجيل الدخول…</Text>
          </>
        )}
      </View>
    </Screen>
  );
}
