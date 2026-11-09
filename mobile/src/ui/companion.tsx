import type { ReactNode } from "react";
import { View } from "react-native";
import { RAFED_VIEWBOX, rafedMarkup, type RafedMood, type RafedStage } from "@shared/art/rafed";
import { Art } from "./art";
import { Text } from "./text";
import { colors } from "./theme";

/** Rafed with a speech bubble. */
export function RafedGreeting({ children, mood = "happy", stage = 1 }: { children: ReactNode; mood?: RafedMood; stage?: RafedStage }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
      <Art markup={rafedMarkup({ id: "rg", stage, mood, wave: true, filters: false })} viewBox={RAFED_VIEWBOX} width={64} height={85} />
      <View
        style={{
          flex: 1,
          backgroundColor: colors.card,
          borderRadius: 18,
          borderBottomLeftRadius: 4,
          padding: 12,
          borderWidth: 1,
          borderColor: colors.border,
          marginBottom: 14,
        }}
      >
        <Text style={{ fontWeight: "600" }}>{children}</Text>
      </View>
    </View>
  );
}
