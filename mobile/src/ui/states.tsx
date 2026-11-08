import { ActivityIndicator, View } from "react-native";
import { Button } from "./button";
import { Text } from "./text";
import { colors } from "./theme";

/** Loading and error states every data screen uses. */
export function Loading() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}

export function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 }}>
      <Text variant="heading" style={{ textAlign: "center" }}>
        تعذر التحميل
      </Text>
      <Text variant="muted" style={{ textAlign: "center" }}>
        تأكد من اتصالك بالإنترنت وحاول مرة أخرى.
      </Text>
      <Button title="حاول مرة أخرى" onPress={onRetry} />
    </View>
  );
}
