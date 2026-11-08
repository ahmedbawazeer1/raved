import { Linking, View } from "react-native";
import { Redirect } from "expo-router";
import { WEB_URL } from "@/config";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { Button, colors, Screen, Text } from "@/ui";

/**
 * «اليوم» — phase 1 placeholder: shows who is signed in and their account state.
 * The real day (journey map, today's session) comes in phase 2.
 */
export default function TodayScreen() {
  const { session, profile } = useSession();
  if (!session) return <Redirect href="/login" />;

  const firstName = profile?.full_name.trim().split(/\s+/)[0] ?? "";
  const active = profile?.status === "active";

  return (
    <Screen>
      <Text variant="title">أهلاً {firstName} 👋</Text>
      {active ? (
        <View style={{ backgroundColor: colors.primaryTint, borderRadius: 16, padding: 16, gap: 6 }}>
          <Text variant="heading">رحلتك قادمة إلى التطبيق</Text>
          <Text variant="muted">نبني الآن شاشات الدروس داخل التطبيق. إلى أن تجهز، تابع دراستك من الموقع بنفس حسابك.</Text>
          <Button title="افتح دروسي في الموقع" onPress={() => Linking.openURL(`${WEB_URL}/student`)} />
        </View>
      ) : (
        <View style={{ backgroundColor: colors.warningTint, borderRadius: 16, padding: 16, gap: 6 }}>
          <Text variant="heading">أكمل طلب الالتحاق</Text>
          <Text variant="muted">حسابك لم يُفعَّل بعد. أكمل خطوات التسجيل في الموقع، وستصلك رسالة عند قبولك.</Text>
          <Button title="أكمل التسجيل" onPress={() => Linking.openURL(`${WEB_URL}/apply`)} />
        </View>
      )}
      <View style={{ marginTop: "auto" }}>
        <Button title="تسجيل الخروج" variant="secondary" onPress={() => supabase.auth.signOut()} />
      </View>
    </Screen>
  );
}
