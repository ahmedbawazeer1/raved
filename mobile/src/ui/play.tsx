import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { AVATAR_HEAD_VIEWBOX, AVATAR_VIEWBOX, avatarMarkup, parseAvatar } from "@shared/art/avatar";
import { RAFED_VIEWBOX, rafedMarkup, type RafedMood, type RafedStage } from "@shared/art/rafed";
import { tierOf } from "@shared/gamification/league";
import { Art } from "./art";
import { Text } from "./text";
import { colors, radius, TOUCH } from "./theme";

export type ChipState = "idle" | "right" | "wrong" | "dim";

const CHIP: Record<ChipState, { bg: string; border: string; fg: string }> = {
  idle: { bg: colors.card, border: colors.border, fg: colors.ink },
  right: { bg: colors.successTint, border: colors.success, fg: colors.success },
  wrong: { bg: colors.errorTint, border: colors.error, fg: colors.error },
  dim: { bg: colors.card, border: colors.border, fg: colors.muted },
};

/** A big answer button for games (with right / wrong states). */
export function Chip({
  label,
  state = "idle",
  onPress,
  en = false,
  disabled,
}: {
  label: string;
  state?: ChipState;
  onPress: () => void;
  en?: boolean;
  disabled?: boolean;
}) {
  const c = CHIP[state];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: TOUCH + 12,
        paddingHorizontal: 12,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: radius.lg,
        borderWidth: 2,
        borderBottomWidth: pressed ? 2 : 5,
        borderColor: c.border,
        backgroundColor: c.bg,
        opacity: state === "dim" ? 0.5 : 1,
        transform: [{ translateY: pressed ? 3 : 0 }],
      })}
    >
      <Text variant={en ? "en" : "body"} style={{ color: c.fg, fontWeight: "700", textAlign: "center" }}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Another student's (or the student's own) avatar head; Rafed when there is none (the bot). */
export function Face({ avatar, size = 40, rafed = false }: { avatar?: unknown; size?: number; rafed?: boolean }) {
  if (rafed)
    return <Art markup={rafedMarkup({ id: "fb", stage: 3, mood: "happy", filters: false })} viewBox={RAFED_VIEWBOX} width={size * 0.75} height={size} />;
  return <Art markup={avatarMarkup(parseAvatar(avatar), { id: "fh", filters: false })} viewBox={AVATAR_HEAD_VIEWBOX} width={size} height={size * 1.15} />;
}

export function FullAvatar({ avatar, height = 120 }: { avatar?: unknown; height?: number }) {
  return <Art markup={avatarMarkup(parseAvatar(avatar), { id: "fa", filters: false })} viewBox={AVATAR_VIEWBOX} width={height * 0.6} height={height} />;
}

export function RafedArt({ size = 90, stage = 3, mood = "idle" }: { size?: number; stage?: RafedStage; mood?: RafedMood }) {
  return <Art markup={rafedMarkup({ id: "ra", stage, mood, filters: false })} viewBox={RAFED_VIEWBOX} width={size * 0.75} height={size} />;
}

/** A league tier's badge (glossy water drop in the tier's colours). */
export function TierBadge({ tier, size = 48, locked = false }: { tier: number; size?: number; locked?: boolean }) {
  const t = tierOf(tier);
  const deep = locked ? "#B4C3BE" : t.deep,
    light = locked ? "#E2E8E6" : t.light;
  const markup = `<defs><radialGradient id="tb${tier}${locked ? "l" : ""}" cx=".32" cy=".28" r=".85"><stop offset="0" stop-color="${light}"/><stop offset="1" stop-color="${deep}"/></radialGradient></defs><path d="M32 6C32 6 12 28 12 40a20 20 0 0 0 40 0C52 28 32 6 32 6Z" fill="url(#tb${tier}${locked ? "l" : ""})"/><ellipse cx="24" cy="30" rx="4" ry="7" fill="#fff" opacity=".45" transform="rotate(20 24 30)"/>`;
  return <Art markup={markup} viewBox="0 0 64 64" width={size} height={size} />;
}

/** A bottle that fills with right answers. */
export function Bottle({ value, total, color, label }: { value: number; total: number; color: string; label: string }) {
  const p = total ? Math.min(1, value / total) : 0;
  return (
    <View accessible accessibilityLabel={`${label}: ${value} من ${total}`} style={{ alignItems: "center", gap: 4 }}>
      <View
        style={{
          width: 46,
          height: 90,
          borderRadius: 14,
          borderWidth: 3,
          borderColor: colors.card,
          backgroundColor: "rgba(255,255,255,.4)",
          overflow: "hidden",
          justifyContent: "flex-end",
        }}
      >
        <View style={{ height: `${p * 100}%`, backgroundColor: color }} />
      </View>
      <Text variant="en" style={{ fontWeight: "700", textAlign: "center" }}>
        {value}/{total}
      </Text>
    </View>
  );
}

export function Row({ children, gap = 8 }: { children: ReactNode; gap?: number }) {
  return <View style={{ flexDirection: "row", alignItems: "center", gap }}>{children}</View>;
}
