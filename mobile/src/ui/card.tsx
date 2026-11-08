import type { ReactNode } from "react";
import { View, type ViewStyle } from "react-native";
import { colors, radius } from "./theme";

export function Card({ children, style, tone = "plain" }: { children: ReactNode; style?: ViewStyle; tone?: "plain" | "primary" | "warning" | "ai" }) {
  const bg = { plain: colors.card, primary: colors.primaryTint, warning: colors.warningTint, ai: colors.aiTint }[tone];
  return (
    <View
      style={[{ backgroundColor: bg, borderRadius: radius.lg, padding: 16, gap: 8, borderWidth: tone === "plain" ? 1 : 0, borderColor: colors.border }, style]}
    >
      {children}
    </View>
  );
}

export function ProgressBar({
  value,
  max,
  color = colors.accent,
  track = "rgba(255,255,255,.25)",
}: {
  value: number;
  max: number;
  color?: string;
  track?: string;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max, now: value }}
      style={{ flex: 1, height: 10, borderRadius: 999, backgroundColor: track, overflow: "hidden" }}
    >
      <View style={{ width: `${pct}%`, height: "100%", borderRadius: 999, backgroundColor: color }} />
    </View>
  );
}
