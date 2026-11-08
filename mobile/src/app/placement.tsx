import { Linking, View } from "react-native";
import { WEB_URL } from "@/config";
import { Button, Header, Screen, Text } from "@/ui";

/** Placement test: on the website for now (same account); the app version comes next. */
export default function PlacementScreen() {
  return (
    <>
      <Header title="اختبار تحديد المستوى" />
      <Screen>
        <View style={{ gap: 12 }}>
          <Text variant="heading">20 دقيقة تقريباً</Text>
          <Text variant="muted">يحدد الاختبار الوحدة المناسبة لتبدأ منها. افتحه في موقع رفد بنفس حسابك، وعد بعده إلى التطبيق.</Text>
          <Button title="ابدأ الاختبار" onPress={() => Linking.openURL(`${WEB_URL}/placement`)} />
        </View>
      </Screen>
    </>
  );
}
