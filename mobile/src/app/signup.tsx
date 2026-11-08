import { useState } from "react";
import { Linking, View } from "react-native";
import { Redirect, router } from "expo-router";
import { WEB_URL } from "@/config";
import { authErrorAr } from "@/lib/auth-errors";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { Button, Card, Field, Header, Screen, Text } from "@/ui";

/** New account (same as the website's /signup). Then the 8-step application inside the app. */
export default function SignupScreen() {
  const { session } = useSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  if (session) return <Redirect href="/apply" />;

  async function signUp() {
    if (name.trim().length < 2) return setError("اكتب اسمك الكامل.");
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("اكتب بريداً إلكترونياً صحيحاً.");
    if (password.length < 8) return setError("كلمة المرور 8 أحرف على الأقل.");
    setBusy(true);
    setError(null);
    const { data, error: e } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: name.trim() }, emailRedirectTo: `${WEB_URL}/auth/callback?next=/apply` },
    });
    setBusy(false);
    if (e) return setError(authErrorAr(e.message));
    if (data.session) router.replace("/apply");
    else setSent(true);
  }

  return (
    <>
      <Header title="أنشئ حساباً" />
      <Screen>
        {sent ? (
          <Card tone="primary">
            <Text variant="heading">افتح بريدك ✉️</Text>
            <Text variant="muted">أرسلنا رسالة تأكيد إلى {email}. اضغط الرابط فيها، ثم ارجع وسجّل الدخول لتكمل طلب الالتحاق.</Text>
            <Button title="إلى تسجيل الدخول" onPress={() => router.replace("/login")} />
          </Card>
        ) : (
          <View style={{ gap: 14 }}>
            <Field label="اسمك الكامل" value={name} onChangeText={setName} autoComplete="name" />
            <Field
              label="البريد الإلكتروني"
              value={email}
              onChangeText={setEmail}
              ltr
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <Field label="كلمة المرور (8 أحرف على الأقل)" value={password} onChangeText={setPassword} ltr secureTextEntry autoComplete="new-password" />
            {error ? <Text style={{ color: "#B42318" }}>{error}</Text> : null}
            <Button title="أنشئ الحساب" loading={busy} onPress={() => void signUp()} />
            <Text variant="small" style={{ textAlign: "center" }} onPress={() => Linking.openURL(`${WEB_URL}/terms`)}>
              بإنشاء الحساب توافق على الشروط وسياسة الخصوصية.
            </Text>
          </View>
        )}
      </Screen>
    </>
  );
}
