import { Text as RNText, type TextProps } from "react-native";
import { colors, fonts } from "./theme";

type Variant = "title" | "heading" | "body" | "muted" | "small" | "en";

const STYLES: Record<Variant, object> = {
  title: { fontFamily: fonts.bold, fontSize: 26, lineHeight: 40, color: colors.ink },
  heading: { fontFamily: fonts.bold, fontSize: 19, lineHeight: 30, color: colors.ink },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 27, color: colors.ink },
  muted: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 25, color: colors.muted },
  small: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 20, color: colors.muted },
  en: { fontFamily: fonts.en, fontSize: 16, lineHeight: 24, color: colors.ink, writingDirection: "ltr" },
};

/** All text goes through here, so fonts and sizes change in one place. */
export function Text({ variant = "body", style, ...props }: TextProps & { variant?: Variant }) {
  return <RNText {...props} style={[{ textAlign: variant === "en" ? "left" : "right" }, STYLES[variant], style]} />;
}
