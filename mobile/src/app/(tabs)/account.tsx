import { BUILD_CODE } from "@/lib/build-update";
import { useState } from "react";
import { Linking, Pressable, ScrollView, Switch, TextInput, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { AVATAR_VIEWBOX, HAIR_STYLES, SKINS, avatarMarkup } from "@shared/art/avatar";
import { WEB_URL } from "@/config";
import { APP_VERSION } from "@/lib/app-config";
import { useFxPrefs } from "@/lib/fx";
import { setPrefs, usePrefs } from "@/lib/prefs";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { Art, Button, Card, colors, fonts, radius, Text } from "@/ui";

/** «حسابي»: avatar, effects, a note for the Raved team, account links and sign out. */
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

        <Button title="🏅 تقدّمي: المستوى والشارات والطوابع" variant="secondary" onPress={() => router.push("/progress")} />

        <Card>
          <Text variant="heading">شخصيتك</Text>
          <View style={{ alignItems: "center", backgroundColor: colors.primaryTint, borderRadius: radius.lg, paddingVertical: 10 }}>
            <Art markup={avatarMarkup(prefs.avatar, { id: "me", filters: false })} viewBox={AVATAR_VIEWBOX} width={84} height={140} />
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {HAIR_STYLES.map((h) => (
              <Pressable
                key={h.key}
                onPress={() => setPrefs({ avatar: { ...prefs.avatar, hair: h.key } })}
                accessibilityRole="radio"
                accessibilityState={{ checked: prefs.avatar.hair === h.key }}
                style={{
                  minHeight: 44,
                  justifyContent: "center",
                  paddingHorizontal: 12,
                  borderRadius: radius.md,
                  borderWidth: 2,
                  borderColor: prefs.avatar.hair === h.key ? colors.primary : colors.border,
                  backgroundColor: prefs.avatar.hair === h.key ? colors.primaryTint : colors.card,
                }}
              >
                <Text style={{ fontFamily: fonts.semibold }}>{h.label}</Text>
              </Pressable>
            ))}
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {SKINS.map((c) => (
              <Pressable
                key={c}
                onPress={() => setPrefs({ avatar: { ...prefs.avatar, skin: c } })}
                accessibilityRole="radio"
                accessibilityLabel={c}
                accessibilityState={{ checked: prefs.avatar.skin === c }}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: c,
                  borderWidth: 3,
                  borderColor: prefs.avatar.skin === c ? colors.primary : colors.card,
                }}
              />
            ))}
          </View>
          <Text variant="muted">باقي الألوان والإضافات من حسابك على الموقع.</Text>
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
          {BUILD_CODE ? ` (بناء ${BUILD_CODE})` : ""}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
