import { ActivityIndicator, Pressable, type PressableProps } from "react-native";
import { Text } from "./text";
import { colors, fonts, radius, TOUCH } from "./theme";

type Variant = "primary" | "accent" | "secondary";

const BG: Record<Variant, string> = { primary: colors.primary, accent: colors.accent, secondary: colors.card };
const FG: Record<Variant, string> = { primary: "#FFFFFF", accent: colors.ink, secondary: colors.ink };

export function Button({
  title,
  variant = "primary",
  loading = false,
  disabled,
  ...props
}: PressableProps & { title: string; variant?: Variant; loading?: boolean }) {
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: loading }}
      disabled={off}
      {...props}
      style={({ pressed }) => ({
        minHeight: TOUCH + 8,
        borderRadius: radius.md,
        paddingHorizontal: 20,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: BG[variant],
        borderWidth: variant === "secondary" ? 1 : 0,
        borderColor: colors.border,
        opacity: off ? 0.6 : 1,
        transform: [{ translateY: pressed ? 2 : 0 }],
      })}
    >
      {loading ? (
        <ActivityIndicator color={FG[variant]} />
      ) : (
        <Text style={{ fontFamily: fonts.semibold, fontSize: 17, color: FG[variant], textAlign: "center" }}>{title}</Text>
      )}
    </Pressable>
  );
}
