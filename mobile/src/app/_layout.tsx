import { APK_URL, useNewerBuild } from "@/lib/build-update";
import { useEffect } from "react";
import { Linking, View } from "react-native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { IBMPlexSansArabic_400Regular, IBMPlexSansArabic_600SemiBold, IBMPlexSansArabic_700Bold } from "@expo-google-fonts/ibm-plex-sans-arabic";
import { Inter_400Regular, Inter_600SemiBold } from "@expo-google-fonts/inter";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppConfigProvider, useAppConfig } from "@/lib/app-config";
import { QueryProvider } from "@/lib/query";
import { SessionProvider, useSession } from "@/lib/session";
import { Button, colors, Screen, Text } from "@/ui";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    IBMPlexSansArabic_400Regular,
    IBMPlexSansArabic_600SemiBold,
    IBMPlexSansArabic_700Bold,
    Inter_400Regular,
    Inter_600SemiBold,
  });

  return (
    <SafeAreaProvider>
      <QueryProvider>
        <AppConfigProvider>
          <SessionProvider>
            <StatusBar style="dark" />
            {fontsLoaded ? <Gate /> : null}
          </SessionProvider>
        </AppConfigProvider>
      </QueryProvider>
    </SafeAreaProvider>
  );
}

/** Waits for the session, then shows the app (or the «update required» screen). */
function Gate() {
  const { loading } = useSession();
  const { update, config } = useAppConfig();
  const newerBuild = useNewerBuild();

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync();
  }, [loading]);

  if (loading) return null;
  if (update === "required") {
    return (
      <Screen>
        <View style={{ flex: 1, justifyContent: "center", gap: 16 }}>
          <Text variant="title">حدّث تطبيق رفد</Text>
          <Text variant="muted">هذه النسخة قديمة. حمّل النسخة الجديدة لتكمل دراستك، وتقدمك محفوظ.</Text>
          {config.store_url ? <Button title="تحديث التطبيق" onPress={() => Linking.openURL(config.store_url!)} /> : null}
        </View>
      </Screen>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {config.notice_ar ? (
        <View style={{ backgroundColor: colors.warningTint, paddingTop: 44, paddingBottom: 8, paddingHorizontal: 16 }}>
          <Text style={{ color: colors.warning, fontSize: 14 }}>{config.notice_ar}</Text>
        </View>
      ) : null}
      {newerBuild ? (
        <View
          style={{
            backgroundColor: colors.primaryTint,
            paddingTop: config.notice_ar ? 8 : 44,
            paddingBottom: 8,
            paddingHorizontal: 16,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
          }}
        >
          <Text style={{ flex: 1, fontSize: 14, fontWeight: "700" }}>تحديث جديد لرفد متاح. يأخذ دقيقة، وتقدمك محفوظ.</Text>
          <Button title="حدّث الآن" onPress={() => Linking.openURL(APK_URL)} />
        </View>
      ) : null}
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
    </View>
  );
}
