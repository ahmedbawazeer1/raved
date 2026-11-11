import { ActivityIndicator, Pressable, type PressableProps } from "react-native";
import { Text } from "./text";
import { colors, fonts, radius, TOUCH } from "./theme";

type Variant = "primary" | "accent" | "secondary";

const BG: Record<Variant, string> = { primary: colors.primary, accent: colors.accent, secondary: colors.card };
const EDGE: Record<Variant, string> = { primary: colors.primaryHover, accent: "#C98210", secondary: colors.border };
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
        // A pressable "3D" key: a darker edge under the button that flattens when pressed.
        borderWidth: variant === "secondary" ? 2 : 0,
        borderBottomWidth: pressed ? (variant === "secondary" ? 2 : 0) : 5,
        marginTop: pressed ? 5 - (variant === "secondary" ? 2 : 0) : 0,
        borderColor: EDGE[variant],
        opacity: off ? 0.6 : 1,
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
