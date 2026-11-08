import { Pressable, View } from "react-native";
import { Text } from "./text";
import { colors, radius } from "./theme";

/** A labelled list of choices (radio buttons) for forms. */
export function Choice<T extends string | number>({
  label,
  options,
  value,
  onChange,
  error,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T | null | undefined;
  onChange: (v: T) => void;
  error?: string | null;
}) {
  return (
    <View style={{ gap: 6 }} accessibilityRole="radiogroup" accessibilityLabel={label}>
      <Text style={{ fontWeight: "600" }}>{label}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {options.map((o) => (
          <Pressable
            key={String(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: value === o.value }}
            onPress={() => onChange(o.value)}
            style={{
              minHeight: 44,
              paddingHorizontal: 14,
              justifyContent: "center",
              borderRadius: radius.md,
              borderWidth: 2,
              borderColor: value === o.value ? colors.primary : colors.border,
              backgroundColor: value === o.value ? colors.primaryTint : colors.card,
            }}
          >
            <Text>{o.label}</Text>
          </Pressable>
        ))}
      </View>
      {error ? <Text style={{ color: colors.error, fontSize: 14 }}>{error}</Text> : null}
    </View>
  );
}
