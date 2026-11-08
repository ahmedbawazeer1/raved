import { TextInput, View, type TextInputProps } from "react-native";
import { Text } from "./text";
import { colors, fonts, radius, TOUCH } from "./theme";

/** A labelled text input; `ltr` for emails, numbers and passwords. */
export function Field({ label, error, ltr, ...props }: TextInputProps & { label: string; error?: string | null; ltr?: boolean }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontFamily: fonts.semibold, fontSize: 15 }}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#9AA8A4"
        {...props}
        style={{
          minHeight: TOUCH + 6,
          borderWidth: 1,
          borderColor: error ? colors.error : colors.border,
          borderRadius: radius.md,
          backgroundColor: colors.card,
          paddingHorizontal: 14,
          fontFamily: ltr ? fonts.en : fonts.regular,
          fontSize: 16,
          color: colors.ink,
          textAlign: ltr ? "left" : "right",
          writingDirection: ltr ? "ltr" : "rtl",
        }}
      />
      {error ? <Text style={{ color: colors.error, fontSize: 14 }}>{error}</Text> : null}
    </View>
  );
}
