import { useEffect } from "react";
import { Pressable, ScrollView } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUserId } from "@/data/student";
import { appRoute } from "@/lib/routes";
import { supabase } from "@/lib/supabase";
import { Card, colors, Header, LoadError, Loading, Text } from "@/ui";

/** Notifications (the same rows as the website); opening the screen marks them read. */
export default function NotificationsScreen() {
  const userId = useUserId();
  const queryClient = useQueryClient();
  const q = useQuery({
    queryKey: ["notifications", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id, title, body, link, read_at, created_at")
        .eq("student_id", userId!)
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });
  useEffect(() => {
    if (!userId || !q.data?.some((n) => !n.read_at)) return;
    void supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("student_id", userId)
      .is("read_at", null)
      .then(() => queryClient.invalidateQueries({ queryKey: ["home"] }));
  }, [q.data, userId, queryClient]);

  if (q.isLoading) return <Loading />;
  if (q.isError) return <LoadError onRetry={() => void q.refetch()} />;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top", "bottom"]}>
      <Header title="الإشعارات" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
        {!q.data?.length ? <Text variant="muted">لا إشعارات بعد.</Text> : null}
        {q.data?.map((n) => (
          <Pressable
            key={n.id}
            onPress={() => {
              const r = n.link ? appRoute(n.link) : null;
              if (r) router.push(r);
            }}
          >
            <Card tone={n.read_at ? "plain" : "primary"}>
              <Text style={{ fontWeight: "700" }}>{n.title}</Text>
              {n.body ? <Text variant="muted">{n.body}</Text> : null}
              <Text variant="small">{new Date(n.created_at).toLocaleDateString("ar")}</Text>
            </Card>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
