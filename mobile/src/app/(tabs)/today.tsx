import { Pressable, RefreshControl, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useHome } from "@/data/student";
import { JourneyMap } from "@/features/journey/journey-map";
import { appRoute } from "@/lib/routes";
import { useSession } from "@/lib/session";
import { Button, Card, colors, CompanionGreeting, LoadError, Loading, ProgressBar, Text } from "@/ui";

function greeting(): string {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Asia/Aden" }).format(new Date()));
  return hour < 12 ? "صباح الخير" : "مساء الخير";
}

/** «اليوم»: points and streak, today's session, quests and the journey map (as on the website). */
export default function TodayScreen() {
  const { profile } = useSession();
  const home = useHome();
  if (home.isLoading) return <Loading />;
  if (home.isError || !home.data) return <LoadError onRetry={() => void home.refetch()} />;
  const d = home.data;
  const first = profile?.full_name.trim().split(/\s+/)[0] ?? "";
  const step = d.step;
  const unit = step.kind === "lesson" || step.kind === "quiz" ? step.unit : null;
  const levelCode = unit?.levelCode ?? d.curriculum?.units.at(-1)?.levelCode;
  const mapUnits = d.curriculum ? d.curriculum.units.filter((u) => u.levelCode === levelCode) : [];
  const bubble = unit
    ? `${greeting()} يا ${first}! محطتك اليوم: ${unit.stop ?? `الوحدة ${unit.position}`}. ${step.kind === "quiz" ? "الحارس في انتظارك ⚔️" : "يلا نكمل الرحلة 🚀"}`
    : `${greeting()} يا ${first}!`;
  const go = () => {
    if (step.kind === "lesson") router.push(`/lesson/${step.lessonId}`);
    else if (step.kind === "quiz") router.push(`/quiz/${step.quizId}`);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16 }}
        refreshControl={<RefreshControl refreshing={home.isRefetching} onRefresh={() => void home.refetch()} tintColor={colors.primary} />}
      >
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Stat label="أيام متتالية" value={`🔥 ${d.streak}`} />
          <Stat label="نقاطك" value={`⭐ ${d.xp}`} />
          <Stat label="إشعارات" value={`🔔 ${d.unread}`} />
        </View>

        <CompanionGreeting>{bubble}</CompanionGreeting>

        {d.placementPending ? (
          <Card tone="warning">
            <Text variant="heading">{d.placementStarted ? "أكمل اختبار المستوى" : "حدّد مستواك أولاً"}</Text>
            <Text variant="muted">{d.placementStarted ? "تكمل من نفس السؤال." : "20 دقيقة تقريباً، لتبدأ من الوحدة المناسبة لك."}</Text>
            <Button title={d.placementStarted ? "أكمل" : "ابدأ"} variant="accent" onPress={() => router.push("/placement")} />
          </Card>
        ) : null}

        {step.kind === "empty" ? (
          <Card>
            <Text variant="heading">الدروس قيد الإعداد</Text>
            <Text variant="muted">سننشر أول وحدة قريباً، وسنبلغك هنا عندما تجهز.</Text>
          </Card>
        ) : null}
        {step.kind === "finished" ? (
          <Card>
            <Text variant="heading">أنهيت كل الوحدات المنشورة 🎉</Text>
            <Text variant="muted">وحدات جديدة في الطريق. راجع ما تعلمته حتى ذلك الحين.</Text>
          </Card>
        ) : null}

        {unit ? (
          <View style={{ backgroundColor: colors.primary, borderRadius: 24, padding: 20, gap: 12 }}>
            <Text style={{ color: colors.primaryTint, fontSize: 14 }}>جلسة اليوم</Text>
            <Text variant="heading" style={{ color: "#fff" }}>
              {unit.stop ? `${unit.stop} · ` : ""}الوحدة {unit.position}: {unit.title}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <ProgressBar value={unit.lessonsDone} max={unit.lessons.length} />
              <Text style={{ color: colors.primaryTint, fontSize: 14 }}>
                {unit.lessonsDone} من {unit.lessons.length}
              </Text>
            </View>
            <Button
              variant="accent"
              title={step.kind === "quiz" ? "واجه حارس المحطة" : unit.lessonsDone === 0 ? "ابدأ جلسة اليوم" : "أكمل جلسة اليوم"}
              onPress={go}
            />
          </View>
        ) : null}

        {d.quests.length ? (
          <Card>
            <Text variant="heading">مهام اليوم</Text>
            {d.quests.map((q) => (
              <Pressable
                key={q.key}
                onPress={() => {
                  const r = appRoute(q.href);
                  if (r) router.push(r);
                }}
                style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 44 }}
              >
                <Text style={{ fontSize: 20 }}>{q.done ? "✅" : "⬜"}</Text>
                <Text style={{ flex: 1, textDecorationLine: q.done ? "line-through" : "none", color: q.done ? colors.muted : colors.ink }}>{q.label}</Text>
              </Pressable>
            ))}
          </Card>
        ) : null}

        {mapUnits.length ? <JourneyMap units={mapUnits} /> : null}

        {d.vocabToday > 0 ? (
          <Pressable onPress={() => router.push("/vocab")}>
            <Card>
              <Text variant="heading">مراجعة المفردات</Text>
              <Text variant="muted">{d.vocabToday} كلمة اليوم</Text>
            </Card>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{ flex: 1, backgroundColor: colors.card, borderRadius: 16, paddingVertical: 10, alignItems: "center", borderWidth: 1, borderColor: colors.border }}
    >
      <Text style={{ fontWeight: "700", fontSize: 17, textAlign: "center" }}>{value}</Text>
      <Text variant="small" style={{ textAlign: "center" }}>
        {label}
      </Text>
    </View>
  );
}
