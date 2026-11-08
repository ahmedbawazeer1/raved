import type { ReactNode } from "react";
import { View } from "react-native";
import { companionMarkup, type Mood } from "@shared/art/companion";
import { usePrefs } from "@/lib/prefs";
import { Art } from "./art";
import { Text } from "./text";
import { colors } from "./theme";

/** Hamza or Reem (the student's choice) with a speech bubble. */
export function CompanionGreeting({ children, mood = "happy" }: { children: ReactNode; mood?: Mood }) {
  const { companion } = usePrefs();
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
      <Art markup={companionMarkup({ who: companion, mood, wave: true })} viewBox="0 0 120 160" width={66} height={88} />
      <View style={{ flex: 1, backgroundColor: colors.card, borderRadius: 18, padding: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 14 }}>
        <Text style={{ fontWeight: "600" }}>{children}</Text>
      </View>
    </View>
  );
}
