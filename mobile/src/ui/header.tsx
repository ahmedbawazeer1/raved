import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "./text";
import { colors } from "./theme";

/** Top bar of inner screens: back arrow (points right in RTL), title and subtitle. */
export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 8,
        paddingVertical: 6,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="رجوع"
        onPress={() => (router.canGoBack() ? router.back() : router.replace("/today"))}
        style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
      >
        <Ionicons name="arrow-forward" size={24} color={colors.ink} />
      </Pressable>
      <View style={{ flex: 1 }}>
        {subtitle ? <Text variant="small">{subtitle}</Text> : null}
        <Text style={{ fontWeight: "700" }} numberOfLines={1}>
          {title}
        </Text>
      </View>
    </View>
  );
}
