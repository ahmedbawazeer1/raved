import { useState } from "react";
import { Linking, Pressable, ScrollView, Switch, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { companionMarkup, COMPANIONS } from "@shared/art/companion";
import { WEB_URL } from "@/config";
import { APP_VERSION } from "@/lib/app-config";
import { useFxPrefs } from "@/lib/fx";
import { setPrefs, usePrefs } from "@/lib/prefs";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { Art, Button, Card, colors, fonts, radius, Text } from "@/ui";

/** «حسابي»: companion, effects, a note for the Raved team, account links and sign out. */
export default function AccountScreen() {
  const { profile, session } = useSession();
  const prefs = usePrefs();
  const { effects, setEffects } = useFxPrefs();
  const [note, setNote] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function sendFeedback() {
    if (note.trim().length < 3 || !session) return;
    setBusy(true);
    const { error } = await supabase.from("reports").insert({ student_id: session.user.id, kind: "feedback", note: note.trim().slice(0, 1000), page: "/app" });
    setBusy(false);
    setSent(error ? "تعذر الإرسال. تأكد من الاتصال وحاول مرة أخرى." : "شكراً! وصلت ملاحظتك لفريق رفد.");
    if (!error) setNote("");
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
        <Text variant="title">{profile?.full_name ?? "حسابي"}</Text>
        <Text variant="en" style={{ color: colors.muted }}>
          {session?.user.email}
        </Text>

        <Card>
          <Text variant="heading">رفيقك في الرحلة</Text>
          <View style={{ flexDirection: "row", gap: 12 }}>
            {COMPANIONS.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => setPrefs({ companion: c.id })}
                accessibilityRole="radio"
                accessibilityState={{ checked: prefs.companion === c.id }}
                style={{
                  flex: 1,
                  alignItems: "center",
                  padding: 8,
                  borderRadius: radius.lg,
                  borderWidth: 2,
                  borderColor: prefs.companion === c.id ? colors.primary : colors.border,
                  backgroundColor: prefs.companion === c.id ? colors.primaryTint : colors.card,
                }}
              >
                <Art markup={companionMarkup({ who: c.id, mood: "happy" })} viewBox="0 0 120 160" width={70} height={93} />
                <Text style={{ fontFamily: fonts.semibold }}>{c.name}</Text>
              </Pressable>
            ))}
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 44 }}>
            <Text>الاهتزاز والمؤثرات</Text>
            <Switch value={effects} onValueChange={setEffects} trackColor={{ true: colors.primary }} />
          </View>
        </Card>

        <Card>
          <Text variant="heading">ملاحظاتك تهمّنا</Text>
          <Text variant="muted">مشكلة واجهتك، أو فكرة تجعل رفد أفضل؟ لا تكتب رقم هاتفك أو كلمة مرورك.</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            multiline
            maxLength={1000}
            accessibilityLabel="ملاحظتك"
            style={{
              minHeight: 90,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radius.md,
              padding: 12,
              fontFamily: fonts.regular,
              fontSize: 16,
              textAlign: "right",
              textAlignVertical: "top",
            }}
          />
          {sent ? <Text variant="muted">{sent}</Text> : null}
          <Button title="أرسل الملاحظة" variant="secondary" disabled={note.trim().length < 3} loading={busy} onPress={() => void sendFeedback()} />
        </Card>

        <Card>
          <Text variant="heading">بياناتي وحسابي</Text>
          <Text variant="muted">تعديل بياناتك وكلمة المرور والشهادات وتنزيل بياناتك من موقع رفد بنفس حسابك.</Text>
          <Button title="إعدادات الحساب في الموقع" variant="secondary" onPress={() => Linking.openURL(`${WEB_URL}/student/settings`)} />
          <Button title="سياسة الخصوصية" variant="secondary" onPress={() => Linking.openURL(`${WEB_URL}/privacy`)} />
        </Card>

        <Button title="تسجيل الخروج" variant="secondary" onPress={() => supabase.auth.signOut()} />
        <Text variant="small" style={{ textAlign: "center" }}>
          رفد · نسخة {APP_VERSION}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
