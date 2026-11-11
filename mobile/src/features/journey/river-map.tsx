import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, useWindowDimensions, View, type ScrollViewInstance } from "react-native";
import { router } from "expo-router";
import { riverMarkup, worldFor, type NodeState } from "@shared/art/river";
import type { UnitView } from "@shared/student/progress";
import { usePrefs } from "@/lib/prefs";
import { Art, colors, Text } from "@/ui";

/**
 * The level's world: a river with one lily pad per unit and the student's boat (as on the website).
 * "card": a titled box (the «التعلّم» tab). "stage": fills its parent, stretches to the screen's
 * height and opens on today's unit («اليوم»: the map is the screen).
 */
export function RiverMap({ units, levelCode, variant = "card" }: { units: UnitView[]; levelCode: string; variant?: "card" | "stage" }) {
  const stage = variant === "stage";
  const { width: screen } = useWindowDimensions();
  const { avatar } = usePrefs();
  const [box, setBox] = useState({ w: 0, h: 0 });
  const width = stage ? box.w : Math.min(screen - 32, 520);
  const world = worldFor(levelCode);
  const scroller = useRef<ScrollViewInstance>(null);
  const states = units.map((u) => u.state).join();
  const minHeight = stage && box.w ? Math.round((box.h / box.w) * 360) : 0;
  const { markup, layout } = useMemo(
    () =>
      riverMarkup({
        world,
        avatar,
        id: "mm",
        labels: false,
        minHeight,
        nodes: units.map((u) => ({ state: u.state as NodeState, label: "" })),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [world, avatar, states, minHeight],
  );
  const scale = width ? width / layout.width : 1;
  const height = layout.height * scale;
  const viewport = stage ? box.h : Math.min(height, 560);
  const focus = Math.max(
    0,
    units.findIndex((u) => u.state === "now"),
  );

  useEffect(() => {
    if (!width) return;
    const y = layout.points[focus]?.y ?? 0;
    // Stage: today's unit a little below the middle (the cards float over the top of the map).
    const t = setTimeout(() => scroller.current?.scrollTo({ y: Math.max(0, y * scale - viewport * (stage ? 0.58 : 0.5)), animated: false }), 50);
    return () => clearTimeout(t);
  }, [focus, layout, scale, viewport, stage, width]);

  const map = width ? (
    <ScrollView
      ref={scroller}
      style={
        stage
          ? { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: world.sky }
          : { height: viewport, borderRadius: 24, backgroundColor: world.sky, borderWidth: 1, borderColor: colors.border }
      }
      nestedScrollEnabled
      showsVerticalScrollIndicator={false}
      accessibilityLabel={`خريطة ${world.name}`}
    >
      <View style={{ width, height }}>
        <Art markup={markup} viewBox={`0 0 ${layout.width} ${layout.height}`} width={width} height={height} />
        {units.map((u, i) => {
          const p = layout.points[i];
          const size = 74 * scale;
          return (
            <View key={u.id} style={{ position: "absolute", left: 0, top: 0 }} pointerEvents="box-none">
              {/* Arabic inside SVG text is not shaped by react-native-svg, so the label is a real Text. */}
              <View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  left: p.x * scale - 40 * scale,
                  top: (p.y + 33) * scale,
                  width: 80 * scale,
                  height: 24 * scale,
                  borderRadius: 12 * scale,
                  backgroundColor: u.state === "locked" ? "rgba(255,255,255,.7)" : "rgba(255,255,255,.95)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 12 * scale, lineHeight: 18 * scale, fontWeight: "700", textAlign: "center" }}>الوحدة {u.position}</Text>
              </View>
              <Pressable
                disabled={u.state === "locked"}
                onPress={() => router.push(`/unit/${u.id}`)}
                accessibilityRole="button"
                accessibilityLabel={`الوحدة ${u.position}: ${u.title}${u.state === "done" ? " · مكتملة" : u.state === "now" ? " · دورك الآن" : u.state === "locked" ? " · مقفلة" : ""}`}
                style={{ position: "absolute", left: p.x * scale - size / 2, top: p.y * scale - size / 2, width: size, height: size, borderRadius: size / 2 }}
              />
            </View>
          );
        })}
      </View>
    </ScrollView>
  ) : null;

  if (stage)
    return (
      <View style={{ flex: 1 }} onLayout={(e) => setBox({ w: Math.round(e.nativeEvent.layout.width), h: Math.round(e.nativeEvent.layout.height) })}>
        {map}
      </View>
    );

  return (
    <View style={{ gap: 8 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: world.band,
          borderRadius: 16,
          borderBottomLeftRadius: 5,
          paddingHorizontal: 14,
          paddingVertical: 8,
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "700" }}>
          {world.name} · {levelCode}
        </Text>
        <Text style={{ color: "#fff", fontSize: 12 }}>
          {units.filter((u) => u.state === "done").length} من {units.length} وحدات
        </Text>
      </View>
      {map}
    </View>
  );
}
