import { Redirect, Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { Button, colors, fonts, Screen, Text } from "@/ui";

type IconName = keyof typeof Ionicons.glyphMap;
const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: "today", title: "اليوم", icon: "sunny" },
  { name: "learn", title: "التعلّم", icon: "map" },
  { name: "vocab", title: "المفردات", icon: "layers" },
  { name: "practice", title: "التدريب", icon: "game-controller" },
  { name: "account", title: "حسابي", icon: "person-circle" },
];

/** The student area: five bottom tabs (as on the website). Only for signed-in, accepted students. */
export default function TabsLayout() {
  const { session, profile } = useSession();
  if (!session) return <Redirect href="/login" />;
  if (profile && profile.status === "suspended") {
    return (
      <Screen>
        <Text variant="title">الحساب موقوف</Text>
        <Text variant="muted">تواصل مع فريق رفد لمعرفة السبب.</Text>
        <Button title="تسجيل الخروج" variant="secondary" onPress={() => supabase.auth.signOut()} />
      </Screen>
    );
  }
  if (profile && profile.status !== "active") return <Redirect href="/apply" />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 12 },
        tabBarStyle: { minHeight: 62, paddingTop: 6 },
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{ title: t.title, tabBarIcon: ({ color, size }) => <Ionicons name={t.icon} color={String(color)} size={size} /> }}
        />
      ))}
    </Tabs>
  );
}
