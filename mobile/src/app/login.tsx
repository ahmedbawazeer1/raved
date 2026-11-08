import { useEffect, useState } from "react";
import { Image, Linking, Pressable, View } from "react-native";
import { Redirect, router } from "expo-router";
import { WEB_URL } from "@/config";
import { authErrorAr } from "@/lib/auth-errors";
import { googleEnabled, signInWithGoogle } from "@/lib/google";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { Button, colors, Field, Screen, Text } from "@/ui";

export default function LoginScreen() {
  const { session } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [google, setGoogle] = useState(false);
  useEffect(() => {
    void googleEnabled().then(setGoogle);
  }, []);

  if (session) return <Redirect href="/today" />;

  async function signIn() {
    if (!email.trim() || !password) return setError("اكتب بريدك وكلمة المرور.");
    setBusy(true);
    setError(null);
    const { error: e } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (e) setError(authErrorAr(e.message));
  }

  return (
    <Screen>
      <View style={{ alignItems: "center", marginTop: 32, gap: 8 }}>
        <Image source={require("../../assets/splash-icon.png")} style={{ width: 96, height: 96 }} accessibilityLabel="شعار رفد" />
        <Text variant="title" style={{ textAlign: "center" }}>
          أهلاً بك في رفد
        </Text>
        <Text variant="muted" style={{ textAlign: "center" }}>
          سجّل الدخول بنفس حسابك في موقع رفد.
        </Text>
      </View>

      <View style={{ gap: 14 }}>
        <Field label="البريد الإلكتروني" value={email} onChangeText={setEmail} ltr keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
        <Field label="كلمة المرور" value={password} onChangeText={setPassword} ltr secureTextEntry autoComplete="password" onSubmitEditing={signIn} />
        {error ? (
          <View style={{ backgroundColor: colors.errorTint, borderRadius: 12, padding: 12 }}>
            <Text style={{ color: colors.error }}>{error}</Text>
          </View>
        ) : null}
        <Button title="تسجيل الدخول" onPress={signIn} loading={busy} />
        {google ? (
          <Button
            title="الدخول بحساب Google"
            variant="secondary"
            onPress={async () => {
              const e = await signInWithGoogle();
              if (e) setError(e);
            }}
          />
        ) : null}
        <Pressable onPress={() => Linking.openURL(`${WEB_URL}/forgot`)} style={{ minHeight: 44, justifyContent: "center" }}>
          <Text style={{ color: colors.primary, textAlign: "center" }}>نسيت كلمة المرور؟</Text>
        </Pressable>
      </View>

      <View style={{ marginTop: "auto", gap: 8 }}>
        <Text variant="muted" style={{ textAlign: "center" }}>
          ليس عندك حساب؟
        </Text>
        <Button title="أنشئ حساباً مجاناً" variant="secondary" onPress={() => router.push("/signup")} />
      </View>
    </Screen>
  );
}
