import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, useWindowDimensions, View, type ScrollViewInstance } from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { journeyLayout, landmarks, MAP_WIDTH, type Landmark } from "@shared/art/journey";
import type { UnitView } from "@shared/student/progress";
import { fx } from "@/lib/fx";
import { speak } from "@/lib/speech";
import { Art, colors, Text } from "@/ui";
import { journeyMarkup } from "./markup";

const FOUND_KEY = "raved:map-words";

/** «رحلة حضرموت»: each unit is a stop; tap a stop to open the unit, tap a landmark to learn a word. */
export function JourneyMap({ units }: { units: UnitView[] }) {
  const { width: screen } = useWindowDimensions();
  const width = Math.min(screen - 32, 520);
  const [found, setFound] = useState<Set<string>>(new Set());
  const [word, setWord] = useState<Landmark | null>(null);
  const scroller = useRef<ScrollViewInstance>(null);

  useEffect(() => {
    void AsyncStorage.getItem(FOUND_KEY).then((raw) => {
      try {
        setFound(new Set(JSON.parse(raw ?? "[]") as string[]));
      } catch {
        // ignore
      }
    });
  }, []);

  const layout = useMemo(() => journeyLayout(units.length), [units.length]);
  const marks = useMemo(() => landmarks(layout), [layout]);
  const markup = useMemo(() => journeyMarkup(units, layout, marks, found), [units, layout, marks, found]);
  const scale = width / MAP_WIDTH;
  const height = layout.height * scale;
  const viewport = Math.min(height, 560);
  const stamps = units.filter((u) => u.state === "done").length;
  const nowIndex = units.findIndex((u) => u.state === "now");
  const focus = nowIndex >= 0 ? nowIndex : Math.max(0, stamps - 1);

  useEffect(() => {
    const y = layout.stops[focus]?.y ?? 0;
    const t = setTimeout(() => scroller.current?.scrollTo({ y: Math.max(0, y * scale - viewport * 0.55), animated: false }), 50);
    return () => clearTimeout(t);
  }, [focus, layout, scale, viewport]);

  function discover(m: Landmark) {
    setWord(m);
    speak(m.en);
    if (!found.has(m.key)) {
      const next = new Set(found).add(m.key);
      setFound(next);
      void AsyncStorage.setItem(FOUND_KEY, JSON.stringify([...next]));
      fx("coin");
    } else fx("pop");
  }

  const title = units.some((u) => u.stop) ? "رحلة حضرموت" : "رحلتك";
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <Text variant="heading">{title}</Text>
        <Text style={{ fontSize: 12, color: colors.warning, backgroundColor: colors.warningTint, paddingHorizontal: 10, borderRadius: 999 }}>
          {stamps} من {units.length} أختام · كلمات {found.size}/{marks.length}
        </Text>
      </View>
      <ScrollView
        ref={scroller}
        style={{ height: viewport, borderRadius: 24, backgroundColor: "#EBD9AF", borderWidth: 1, borderColor: colors.border }}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width, height }}>
          <Art markup={markup} viewBox={`0 0 ${MAP_WIDTH} ${layout.height}`} width={width} height={height} />
          {marks.map((m) => (
            <Pressable
              key={m.key}
              accessibilityRole="button"
              accessibilityLabel={`اكتشف كلمة: ${m.ar}`}
              onPress={() => discover(m)}
              style={{
                position: "absolute",
                left: (m.x - m.r) * scale,
                top: (m.y - m.r) * scale,
                width: m.r * 2 * scale,
                height: m.r * 2 * scale,
                borderRadius: 999,
              }}
            />
          ))}
          {units.map((u, i) => {
            const { x, y } = layout.stops[i];
            const size = 74 * scale;
            const label = `الوحدة ${u.position}: ${u.stop ?? u.title}${u.state === "done" ? " · مكتملة" : u.state === "now" ? " · محطتك الآن" : u.state === "locked" ? " · مقفلة" : ""}`;
            return (
              <Pressable
                key={u.id}
                accessibilityRole="button"
                accessibilityLabel={label}
                disabled={u.state === "locked"}
                onPress={() => {
                  fx("pop");
                  router.push(`/unit/${u.id}`);
                }}
                style={({ pressed }) => ({
                  position: "absolute",
                  left: x * scale - size / 2,
                  top: y * scale - size / 2,
                  width: size,
                  height: size,
                  borderRadius: 999,
                  transform: [{ scale: pressed ? 0.94 : 1 }],
                })}
              />
            );
          })}
        </View>
      </ScrollView>
      {word ? (
        <Pressable
          onPress={() => setWord(null)}
          style={{ backgroundColor: colors.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.border, gap: 4 }}
        >
          <Text variant="heading">
            {word.ar} · <Text variant="en">{word.en}</Text>
          </Text>
          <Text variant="muted">{word.fact}</Text>
          <Text variant="small">اضغط للإغلاق</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
