import { useState, type ReactNode } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { RafedMood } from "@shared/art/rafed";
import { stageFor } from "@shared/art/rafed";
import { worldFor } from "@shared/art/river";
import { tierOf } from "@shared/gamification/league";
import type { WateringState } from "@shared/student/watering";
import { useHome } from "@/data/student";
import { RiverMap } from "@/features/journey/river-map";
import { useAppConfig } from "@/lib/app-config";
import { appRoute } from "@/lib/routes";
import { Card, colors, Drop, LoadError, Loading, RafedArt, Text } from "@/ui";
import type { UnitView } from "@shared/student/progress";

const DAYS = ["س", "ح", "ن", "ث", "ر", "خ", "ج"];
const WATER = "#2E9BD6";
const WATER_DEEP = "#1C6FA3";

/** A small pill of the top bar (drops, watering days, league). */
function Pill({ children, label, onPress }: { children: ReactNode; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        minHeight: 44,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 12,
        borderRadius: 12,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      {children}
    </Pressable>
  );
}

/** A "pressable key" button of the design: a darker edge under it that flattens when pressed. */
function Key({
  title,
  color,
  edge,
  fg = "#fff",
  onPress,
  label,
}: {
  title: string;
  color: string;
  edge: string;
  fg?: string;
  onPress: () => void;
  label?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label ?? title}
      style={({ pressed }) => ({
        minHeight: 44,
        paddingHorizontal: 16,
        borderRadius: 15,
        borderBottomLeftRadius: 5,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: color,
        borderBottomWidth: pressed ? 0 : 4,
        borderColor: edge,
        marginTop: pressed ? 4 : 0,
      })}
    >
      <Text style={{ color: fg, fontWeight: "700", fontSize: 15, textAlign: "center" }}>{title}</Text>
    </Pressable>
  );
}

/** What Rafed says by watering state. */
function waterText(state: WateringState): string {
  return {
    watered: "سقيت رافد اليوم · أحسنت!",
    waiting: "رافد ينتظر سقاية اليوم",
    thirsty: "رافد عطشان… درس واحد يرويه",
    rest: "الجمعة راحة · سقايتك محفوظة",
    new: "أنا رافد، وكل درس يسقيني",
  }[state];
}

/**
 * «اليوم» as designed in the flows library: the river map IS the screen. A slim bar above it (drops,
 * watering days, league), a dark-green card with today's unit and Rafed's water card floating on top,
 * Rafed on the bank; quests, shortcuts and the rest open from one round button.
 */
export default function TodayScreen() {
  const home = useHome();
  const { on } = useAppConfig();
  const [open, setOpen] = useState(false);
  if (home.isLoading) return <Loading />;
  if (home.isError || !home.data) return <LoadError onRetry={() => void home.refetch()} />;
  const d = home.data;
  const step = d.step;
  const unit = step.kind === "lesson" || step.kind === "quiz" ? step.unit : null;
  const levelCode = unit?.levelCode ?? d.curriculum?.units.at(-1)?.levelCode ?? "A1";
  const mapUnits = d.curriculum ? d.curriculum.units.filter((u) => u.levelCode === levelCode) : [];
  // No units yet: an empty river with locked pads, so the screen still looks like the real thing.
  const stageUnits = mapUnits.length
    ? mapUnits
    : ([1, 2, 3].map((n) => ({ id: `soon-${n}`, position: n, title: "", state: "locked" })) as unknown as UnitView[]);
  const world = worldFor(levelCode);
  const w = d.watering;
  const units = d.curriculum?.units ?? [];
  const levelsDone = new Set(units.map((u) => u.levelCode)).size - new Set(units.filter((u) => u.state !== "done").map((u) => u.levelCode)).size;
  const mood: RafedMood = w.state === "thirsty" ? "wilt" : w.state === "rest" ? "sleep" : "happy";
  const go = () => {
    if (step.kind === "lesson") router.push(`/lesson/${step.lessonId}`);
    else if (step.kind === "quiz") router.push(`/quiz/${step.quizId}`);
  };
  const cta = step.kind === "quiz" ? "واجه الحارس" : step.kind === "lesson" ? ((unit?.lessonsDone ?? 0) === 0 ? "ابدأ" : "أكمل") : null;
  const ctaLabel = step.kind === "quiz" ? "واجه حارس السدّ" : (unit?.lessonsDone ?? 0) === 0 ? "ابدأ درس اليوم" : "أكمل درس اليوم";
  const undone = d.quests.filter((q) => !q.done).length;
  const tile = (icon: string, label: string, to: Parameters<typeof router.push>[0]) => (
    <Pressable
      key={label}
      onPress={() => {
        setOpen(false);
        router.push(to);
      }}
      accessibilityRole="button"
      style={{
        flex: 1,
        minHeight: 68,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 16,
        backgroundColor: colors.card,
        borderWidth: 2,
        borderBottomWidth: 5,
        borderColor: colors.border,
      }}
    >
      <Text style={{ fontSize: 20, textAlign: "center" }}>{icon}</Text>
      <Text variant="small" style={{ textAlign: "center" }}>
        {label}
      </Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 8 }}>
        <Pill label={`${d.xp} قطرة`} onPress={() => router.push("/progress")}>
          <Drop size={16} />
          <Text variant="en" style={{ fontWeight: "800", fontSize: 15, color: WATER_DEEP }}>
            {d.xp}
          </Text>
        </Pill>
        <Pill label={`${w.days} أيام سقاية`} onPress={() => router.push("/progress")}>
          <Drop size={16} color="#6CCBF2" />
          <Text style={{ fontWeight: "800", fontSize: 15, color: WATER_DEEP }}>{w.days} أيام</Text>
        </Pill>
        <Pill label={`الدوري: ${tierOf(d.tier).name}`} onPress={() => router.push("/league")}>
          <Drop size={14} />
          <Text style={{ fontWeight: "700", fontSize: 14, color: WATER_DEEP }}>{tierOf(d.tier).name}</Text>
        </Pill>
      </View>

      <View style={{ flex: 1 }}>
        <RiverMap units={stageUnits} levelCode={levelCode} variant="stage" />

        {/* Today's unit */}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 8,
            left: 12,
            right: 12,
            backgroundColor: colors.primary,
            borderRadius: 16,
            borderBottomLeftRadius: 5,
            paddingHorizontal: 14,
            paddingVertical: 10,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <View style={{ flex: 1, gap: 2 }}>
            {unit ? (
              <>
                <Text style={{ color: "#fff", opacity: 0.85, fontSize: 12 }}>
                  {world.name} · الوحدة {unit.position}
                </Text>
                <Text variant="en" numberOfLines={1} style={{ color: "#fff", fontWeight: "700", fontSize: 17, textAlign: "right" }}>
                  {unit.title}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 }}>
                  <View style={{ width: 96, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,.3)", overflow: "hidden" }}>
                    <View
                      style={{
                        width: `${Math.round((unit.lessonsDone / Math.max(1, unit.lessons.length)) * 100)}%`,
                        height: 6,
                        backgroundColor: colors.accent,
                      }}
                    />
                  </View>
                  <Text variant="en" style={{ color: "#fff", fontSize: 12, lineHeight: 16 }}>
                    {unit.lessonsDone}/{unit.lessons.length}
                  </Text>
                </View>
              </>
            ) : step.kind === "finished" ? (
              <Text style={{ color: "#fff", fontWeight: "700" }}>أنهيت كل الوحدات المنشورة 🎉</Text>
            ) : (
              <>
                <Text style={{ color: "#fff", opacity: 0.85, fontSize: 12 }}>{world.name}</Text>
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 17 }}>الدروس قيد الإعداد</Text>
                <Text style={{ color: "#fff", opacity: 0.9, fontSize: 13 }}>سننشر أول وحدة قريباً</Text>
              </>
            )}
          </View>
          <Drop size={18} color="#9FE3FF" />
        </View>

        {/* Rafed's water card (or, for a new student, the placement test) */}
        <View
          style={{
            position: "absolute",
            top: 92,
            left: 12,
            right: 12,
            backgroundColor: colors.card,
            borderWidth: 2,
            borderColor: d.placementPending ? colors.accent : "#9FD3EE",
            borderRadius: 18,
            borderBottomLeftRadius: 5,
            paddingHorizontal: 12,
            paddingVertical: 10,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          }}
        >
          {d.placementPending ? <Ionicons name="locate" size={26} color={colors.accent} /> : <Drop size={22} />}
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: "700", fontSize: 14 }}>
              {d.placementPending ? (d.placementStarted ? "أكمل اختبار المستوى" : "حدّد مستواك أولاً") : waterText(w.state)}
            </Text>
            {d.placementPending ? <Text variant="small">{d.placementStarted ? "تكمل من نفس السؤال" : "٢٠ دقيقة لتبدأ من الوحدة المناسبة"}</Text> : null}
          </View>
          {d.placementPending ? (
            <Key title={d.placementStarted ? "أكمل" : "ابدأ"} color={colors.accent} edge="#C77F06" fg="#3A2400" onPress={() => router.push("/placement")} />
          ) : cta ? (
            <Key title={cta} label={ctaLabel} color={WATER} edge={WATER_DEEP} onPress={go} />
          ) : null}
        </View>

        {/* Rafed on the bank (left) and the round button (right) */}
        <View
          pointerEvents="box-none"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 8,
            paddingHorizontal: 8,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-end",
            direction: "ltr",
          }}
        >
          <View pointerEvents="none">
            <RafedArt size={104} stage={stageFor(levelsDone)} mood={mood} />
          </View>
          <Pressable
            onPress={() => setOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={undone ? `مهام اليوم والمزيد، ${undone} متبقية` : "مهام اليوم والمزيد"}
            style={({ pressed }) => ({
              width: 56,
              height: 56,
              borderRadius: 28,
              marginBottom: 6,
              marginRight: 4,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.card,
              borderWidth: 2,
              borderColor: colors.border,
              borderBottomWidth: pressed ? 2 : 5,
            })}
          >
            <Ionicons name="checkbox-outline" size={26} color={colors.primary} />
            {undone > 0 ? (
              <View
                style={{
                  position: "absolute",
                  top: -4,
                  right: -4,
                  minWidth: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: colors.accent,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text variant="en" style={{ fontSize: 11, fontWeight: "700", lineHeight: 16, textAlign: "center" }}>
                  {undone}
                </Text>
              </View>
            ) : null}
          </Pressable>
        </View>
      </View>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,.45)" }} onPress={() => setOpen(false)} accessibilityLabel="إغلاق" />
        <View style={{ maxHeight: "82%", backgroundColor: colors.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28 }}>
          <View
            style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}
          >
            <Text variant="heading">اليوم والمزيد</Text>
            <Pressable
              onPress={() => setOpen(false)}
              accessibilityRole="button"
              accessibilityLabel="إغلاق"
              style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.border, alignItems: "center", justifyContent: "center" }}
            >
              <Ionicons name="close" size={22} color={colors.ink} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: 32, gap: 12 }}>
            <Card>
              <Text style={{ fontWeight: "700" }}>سقاية هذا الأسبوع</Text>
              <View style={{ flexDirection: "row", gap: 6 }} accessibilityLabel="سقاية هذا الأسبوع">
                {w.week.map((watered, i) => (
                  <View key={i} style={{ flex: 1, alignItems: "center", gap: 4 }}>
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: watered ? "#C9F1FF" : i === 6 ? colors.warningTint : colors.card,
                        borderWidth: i === w.todayIndex ? 2 : 1,
                        borderColor: i === w.todayIndex ? colors.primary : colors.border,
                      }}
                    >
                      {watered ? <Drop size={18} /> : i === 6 ? <Text style={{ fontSize: 15 }}>🌙</Text> : null}
                    </View>
                    <Text variant="small" style={{ fontWeight: i === w.todayIndex ? "700" : "400", textAlign: "center" }}>
                      {DAYS[i]}
                    </Text>
                  </View>
                ))}
              </View>
            </Card>

            {d.quests.length ? (
              <Card>
                <Text variant="heading">مهام اليوم</Text>
                {d.quests.map((q) => (
                  <Pressable
                    key={q.key}
                    onPress={() => {
                      const r = appRoute(q.href);
                      if (r) {
                        setOpen(false);
                        router.push(r);
                      }
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

            <View style={{ flexDirection: "row", gap: 8 }}>
              {[
                on("league") ? tile("🏆", "الدوري", "/league") : null,
                on("duel") ? tile("⚔️", "تحدي صديق", "/duel") : null,
                on("games") ? tile("🎮", "الساحة", "/arena") : null,
                tile("🏅", "تقدّمي", "/progress"),
              ]}
            </View>

            {d.vocabToday > 0 ? (
              <Pressable
                onPress={() => {
                  setOpen(false);
                  router.push("/vocab");
                }}
              >
                <Card>
                  <Text variant="heading">مراجعة المفردات</Text>
                  <Text variant="muted">{d.vocabToday} كلمة اليوم</Text>
                </Card>
              </Pressable>
            ) : null}

            <Pressable
              onPress={() => {
                setOpen(false);
                router.push("/notifications");
              }}
            >
              <Card style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Ionicons name="notifications-outline" size={24} color={colors.primary} />
                <Text style={{ flex: 1, fontWeight: "700" }}>الإشعارات</Text>
                {d.unread ? <Text style={{ fontWeight: "700", color: colors.warning }}>{d.unread}</Text> : null}
              </Card>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
