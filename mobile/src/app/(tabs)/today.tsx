import type { ReactNode } from "react";
import { Pressable, RefreshControl, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useHome } from "@/data/student";
import { RiverMap } from "@/features/journey/river-map";
import { stageFor } from "@shared/art/rafed";
import { useAppConfig } from "@/lib/app-config";
import { appRoute } from "@/lib/routes";
import { useSession } from "@/lib/session";
import { Button, Card, colors, Drop, GradientBox, RafedGreeting, LoadError, Loading, ProgressBar, Text } from "@/ui";

const DAYS = ["س", "ح", "ن", "ث", "ر", "خ", "ج"];

function greeting(): string {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Asia/Aden" }).format(new Date()));
  return hour < 12 ? "صباح الخير" : "مساء الخير";
}

/** «اليوم»: drops and watering, Rafed, today's lesson, quests and the river map (as on the website). */
export default function TodayScreen() {
  const { profile } = useSession();
  const home = useHome();
  const { on } = useAppConfig();
  if (home.isLoading) return <Loading />;
  if (home.isError || !home.data) return <LoadError onRetry={() => void home.refetch()} />;
  const d = home.data;
  const first = profile?.full_name.trim().split(/\s+/)[0] ?? "";
  const step = d.step;
  const unit = step.kind === "lesson" || step.kind === "quiz" ? step.unit : null;
  const levelCode = unit?.levelCode ?? d.curriculum?.units.at(-1)?.levelCode;
  const mapUnits = d.curriculum ? d.curriculum.units.filter((u) => u.levelCode === levelCode) : [];
  const w = d.watering;
  const next = step.kind === "quiz" ? "حارس السدّ ينتظرك في اختبار الوحدة." : unit ? `درس اليوم في الوحدة ${unit.position}.` : "";
  const bubble = {
    watered: `أحسنت يا ${first}! سقيت رافد اليوم.`,
    waiting: `${greeting()} يا ${first}! رافد ينتظر سقاية اليوم. ${next}`,
    thirsty: `فاتك يوم يا ${first}… رافد عطشان قليلاً. درس واحد يرويه.`,
    rest: `الجمعة راحة يا ${first}. سقايتك محفوظة.`,
    new: `${greeting()} يا ${first}! أنا رافد، وكل درس تتعلمه يسقيني. ${next}`,
  }[w.state];
  const units = d.curriculum?.units ?? [];
  const levelsDone = new Set(units.map((u) => u.levelCode)).size - new Set(units.filter((u) => u.state !== "done").map((u) => u.levelCode)).size;
  const mood = w.state === "thirsty" ? "wilt" : w.state === "rest" ? "sleep" : "happy";
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
        {/* HUD: watering days, drops, notifications */}
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <Pill label="أيام السقاية" value={w.days} icon={<Drop size={22} />} />
          <Pill label="قطراتك" value={d.xp} icon={<Drop size={22} color="#F5A524" />} />
          <Pressable
            onPress={() => router.push("/notifications")}
            accessibilityRole="button"
            accessibilityLabel={`الإشعارات، ${d.unread} جديدة`}
            style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 20 }}>🔔</Text>
            {d.unread ? (
              <View style={{ position: "absolute", top: 10, right: 12, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent }} />
            ) : null}
          </Pressable>
        </View>

        {/* Watering card: Rafed, his words, and this week (Saturday → Friday, Friday is rest) */}
        <GradientBox from="#FFFFFF" to="#DDF6EC" style={{ padding: 16, gap: 12, borderWidth: 1, borderColor: colors.border }}>
          <RafedGreeting mood={mood} stage={stageFor(levelsDone)}>
            {bubble}
          </RafedGreeting>
          <View style={{ flexDirection: "row", gap: 6 }} accessibilityLabel="سقاية هذا الأسبوع">
            {w.week.map((on, i) => (
              <View key={i} style={{ flex: 1, alignItems: "center", gap: 4 }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: on ? "#C9F1FF" : i === 6 ? colors.warningTint : colors.card,
                    borderWidth: i === w.todayIndex ? 2 : 1,
                    borderColor: i === w.todayIndex ? colors.primary : colors.border,
                  }}
                >
                  {on ? <Drop size={18} /> : i === 6 ? <Text style={{ fontSize: 15 }}>🌙</Text> : null}
                </View>
                <Text variant="small" style={{ fontWeight: i === w.todayIndex ? "700" : "400", textAlign: "center" }}>
                  {DAYS[i]}
                </Text>
              </View>
            ))}
          </View>
        </GradientBox>

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
          <GradientBox radial from="#18A383" to="#08392F" style={{ padding: 20, gap: 12 }}>
            <Text style={{ color: colors.primaryTint, fontSize: 14 }}>جلسة اليوم · الوحدة {unit.position}</Text>
            <Text variant="en" style={{ color: "#fff", fontSize: 22, lineHeight: 30, fontWeight: "700", textAlign: "right" }}>
              {unit.title}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <ProgressBar value={unit.lessonsDone} max={unit.lessons.length} />
              <Text style={{ color: colors.primaryTint, fontSize: 14 }}>
                {unit.lessonsDone} من {unit.lessons.length}
              </Text>
            </View>
            <Button
              variant="accent"
              title={step.kind === "quiz" ? "واجه حارس السدّ" : unit.lessonsDone === 0 ? "ابدأ درس اليوم" : "أكمل درس اليوم"}
              onPress={go}
            />
          </GradientBox>
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
                <View
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 13,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: q.done ? colors.success : colors.card,
                    borderWidth: 2,
                    borderColor: q.done ? colors.success : colors.border,
                  }}
                >
                  {q.done ? <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>✓</Text> : null}
                </View>
                <Text style={{ flex: 1, textDecorationLine: q.done ? "line-through" : "none", color: q.done ? colors.muted : colors.ink }}>{q.label}</Text>
              </Pressable>
            ))}
          </Card>
        ) : null}

        {mapUnits.length && levelCode ? <RiverMap units={mapUnits} levelCode={levelCode} /> : null}

        <View style={{ flexDirection: "row", gap: 8 }}>
          {[
            { show: on("league"), icon: "🏆", label: "الدوري", to: "/league" as const },
            { show: on("duel"), icon: "⚔️", label: "تحدي صديق", to: "/duel" as const },
            { show: on("games"), icon: "🎮", label: "الساحة", to: "/arena" as const },
            { show: true, icon: "🏅", label: "تقدّمي", to: "/progress" as const },
          ]
            .filter((l) => l.show)
            .map((l) => (
              <Pressable
                key={l.to}
                onPress={() => router.push(l.to)}
                style={{
                  flex: 1,
                  minHeight: 64,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 16,
                  backgroundColor: colors.card,
                  borderWidth: 2,
                  borderBottomWidth: 5,
                  borderColor: colors.border,
                }}
              >
                <Text style={{ fontSize: 20, textAlign: "center" }}>{l.icon}</Text>
                <Text variant="small" style={{ textAlign: "center" }}>
                  {l.label}
                </Text>
              </Pressable>
            ))}
        </View>

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

function Pill({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}`}
      style={{
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: colors.card,
        borderRadius: 26,
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      {icon}
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: "700", fontSize: 18, lineHeight: 24 }}>{value}</Text>
        <Text variant="small">{label}</Text>
      </View>
    </View>
  );
}
