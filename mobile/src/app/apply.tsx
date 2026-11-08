import { useMemo, useState } from "react";
import { Pressable, ScrollView, Switch, View } from "react-native";
import { Redirect, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { DAILY_MINUTES, TARGET_DATES, TARGET_EXAMS } from "@shared/apply/options";
import { fieldErrors, step1Schema, step2Schema } from "@shared/apply/schemas";
import { GRADES, STREAMS } from "@shared/yemen";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { Button, Choice, colors, Field, Header, LoadError, Loading, ProgressBar, Text } from "@/ui";

type Values = Record<string, string>;
const STEPS = [
  { title: "عرّفنا بنفسك", fields: ["full_name", "birth_date"] },
  { title: "من أين أنت؟", fields: ["governorate", "city"] },
  { title: "مدرستك", fields: ["school", "grade", "stream"] },
  { title: "رقم هاتفك", fields: ["phone"] },
  { title: "مسارك", fields: ["path_id"] },
  { title: "هدفك", fields: ["target_exam", "target_date"] },
  { title: "وقتك", fields: ["daily_minutes", "motivation"] },
  { title: "الموافقة", fields: ["guardian_consent", "privacy_consent"] },
];

/**
 * Application to join, in 8 short steps (same rules as the website: shared/apply/schemas.ts and the
 * submit_application() database function). Saved to the profile and application as the student goes.
 */
export default function ApplyScreen() {
  const { session, profile, refreshProfile } = useSession();
  const q = useQuery({
    queryKey: ["apply", session?.user.id],
    enabled: Boolean(session),
    queryFn: async () => {
      const uid = session!.user.id;
      const [gov, paths, prof, app] = await Promise.all([
        supabase.from("governorates").select("code, name_ar").order("position"),
        supabase.from("paths").select("id, title").eq("status", "published").order("position"),
        supabase.from("profiles").select("full_name, birth_date, governorate, city, school, grade, stream, phone").eq("id", uid).maybeSingle(),
        supabase.from("applications").select("status, path_id, target_exam, target_date, daily_minutes, motivation").eq("student_id", uid).maybeSingle(),
      ]);
      return { governorates: gov.data ?? [], paths: paths.data ?? [], profile: prof.data, application: app.data };
    },
  });
  const [step, setStep] = useState(0);
  /** What the student typed in this visit, on top of what was saved before. */
  const [edits, setV] = useState<Values>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const saved = useMemo(() => {
    const out: Values = {};
    if (!q.data) return out;
    for (const [k, val] of Object.entries({ ...(q.data.profile ?? {}), ...(q.data.application ?? {}) })) {
      if (val !== null && val !== undefined && k !== "status") out[k] = String(val);
    }
    if (out.phone) out.phone = out.phone.replace(/^\+967/, "");
    return out;
  }, [q.data]);
  const v: Values = { ...saved, ...edits };

  if (!session) return <Redirect href="/login" />;
  if (q.isLoading) return <Loading />;
  if (q.isError || !q.data) return <LoadError onRetry={() => void q.refetch()} />;
  const status = q.data.application?.status;
  if (profile?.status === "active") return <Redirect href="/today" />;
  if (done || (status && !["draft", "needs_changes"].includes(status))) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <Header title="طلب الالتحاق" />
        <View style={{ padding: 24, gap: 12 }}>
          <Text variant="title">{done === "approved" ? "تم قبولك! 🎉" : "وصل طلبك ✅"}</Text>
          <Text variant="muted">{done === "approved" ? "ابدأ رحلتك الآن." : "سنراجع طلبك ونبلغك بالنتيجة في التطبيق وبالبريد."}</Text>
          <Button
            title={done === "approved" ? "ابدأ" : "حسناً"}
            onPress={async () => {
              await refreshProfile();
              router.replace(done === "approved" ? "/today" : "/");
            }}
          />
        </View>
      </SafeAreaView>
    );
  }

  const set = (k: string) => (val: string | number) => setV((cur) => ({ ...cur, [k]: String(val) }));
  const current = STEPS[step];

  async function next() {
    setErrors({});
    // Validate only this step's fields with the shared schemas.
    if (step < 4) {
      const parsed = step1Schema.safeParse(v);
      const errs = parsed.success ? {} : fieldErrors(parsed.error);
      const mine = Object.fromEntries(Object.entries(errs).filter(([k]) => current.fields.includes(k)));
      if (Object.keys(mine).length) return setErrors(mine);
      if (step === 3 && parsed.success) {
        setBusy(true);
        const { error } = await supabase.from("profiles").update(parsed.data).eq("id", session!.user.id);
        if (!error && !q.data!.application) await supabase.from("applications").insert({ student_id: session!.user.id });
        setBusy(false);
        if (error) return setErrors({ phone: "تعذر الحفظ. تحقق من الاتصال وحاول مرة أخرى." });
      }
      return setStep(step + 1);
    }
    if (step < 7) {
      const parsed = step2Schema.safeParse(v);
      const errs = parsed.success ? {} : fieldErrors(parsed.error);
      const mine = Object.fromEntries(Object.entries(errs).filter(([k]) => current.fields.includes(k)));
      if (Object.keys(mine).length) return setErrors(mine);
      return setStep(step + 1);
    }
    const parsed = step2Schema.safeParse(v);
    const errs: Record<string, string> = {};
    if (v.guardian_consent !== "true") errs.guardian_consent = "يلزم أن يعلم ولي أمرك ويوافق.";
    if (v.privacy_consent !== "true") errs.privacy_consent = "يلزم الموافقة على سياسة الخصوصية والشروط.";
    if (!parsed.success || Object.keys(errs).length) return setErrors({ ...errs, ...(parsed.success ? {} : fieldErrors(parsed.error)) });
    setBusy(true);
    await supabase.from("applications").update(parsed.data).eq("student_id", session!.user.id).in("status", ["draft", "needs_changes"]);
    const { data, error } = await supabase.rpc("submit_application", { p_guardian_consent: true, p_privacy_consent: true });
    setBusy(false);
    if (error) return setErrors({ privacy_consent: "تعذر الإرسال. تحقق من الاتصال وحاول مرة أخرى." });
    setDone(String(data));
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top", "bottom"]}>
      <Header title={current.title} subtitle={`الخطوة ${step + 1} من ${STEPS.length}`} />
      <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
        <ProgressBar value={step + 1} max={STEPS.length} color={colors.accent} track={colors.border} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
        {step === 0 ? (
          <>
            <Field label="اسمك الكامل" value={v.full_name ?? ""} onChangeText={set("full_name")} error={errors.full_name} />
            <Field
              label="تاريخ الميلاد (سنة-شهر-يوم)"
              placeholder="2009-05-01"
              value={v.birth_date ?? ""}
              onChangeText={set("birth_date")}
              ltr
              keyboardType="numbers-and-punctuation"
              error={errors.birth_date}
            />
          </>
        ) : null}
        {step === 1 ? (
          <>
            <Choice
              label="المحافظة"
              options={q.data.governorates.map((g) => ({ value: g.code, label: g.name_ar }))}
              value={v.governorate}
              onChange={set("governorate")}
              error={errors.governorate}
            />
            <Field label="المدينة أو المديرية" value={v.city ?? ""} onChangeText={set("city")} error={errors.city} />
          </>
        ) : null}
        {step === 2 ? (
          <>
            <Field label="اسم المدرسة" value={v.school ?? ""} onChangeText={set("school")} error={errors.school} />
            <Choice
              label="الصف"
              options={GRADES.map((g) => ({ value: String(g.value), label: g.label }))}
              value={v.grade}
              onChange={set("grade")}
              error={errors.grade}
            />
            <Choice label="القسم" options={STREAMS} value={v.stream} onChange={set("stream")} error={errors.stream} />
          </>
        ) : null}
        {step === 3 ? (
          <Field
            label="رقم هاتفك"
            placeholder="77 123 4567"
            value={v.phone ?? ""}
            onChangeText={set("phone")}
            ltr
            keyboardType="phone-pad"
            error={errors.phone}
          />
        ) : null}
        {step === 4 ? (
          <Choice
            label="المسار"
            options={q.data.paths.map((p) => ({ value: p.id, label: p.title }))}
            value={v.path_id}
            onChange={set("path_id")}
            error={errors.path_id}
          />
        ) : null}
        {step === 5 ? (
          <>
            <Choice label="الامتحان الذي تستهدفه" options={TARGET_EXAMS} value={v.target_exam} onChange={set("target_exam")} error={errors.target_exam} />
            <Choice label="متى تريد أن تختبر؟" options={TARGET_DATES} value={v.target_date} onChange={set("target_date")} error={errors.target_date} />
          </>
        ) : null}
        {step === 6 ? (
          <>
            <Choice
              label="كم دقيقة تدرس يومياً؟"
              options={DAILY_MINUTES.map((m) => ({ value: String(m), label: `${m} دقيقة` }))}
              value={v.daily_minutes}
              onChange={set("daily_minutes")}
              error={errors.daily_minutes}
            />
            <Field label="لماذا تريد التعلم؟ (اختياري)" value={v.motivation ?? ""} onChangeText={set("motivation")} multiline maxLength={600} />
          </>
        ) : null}
        {step === 7 ? (
          <>
            {[
              { key: "guardian_consent", label: "ولي أمري يعلم بتسجيلي في رفد ويوافق." },
              { key: "privacy_consent", label: "قرأت سياسة الخصوصية والشروط وأوافق عليها." },
            ].map((c) => (
              <Pressable
                key={c.key}
                onPress={() => set(c.key)(v[c.key] === "true" ? "false" : "true")}
                style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 48 }}
              >
                <Switch value={v[c.key] === "true"} onValueChange={(on) => set(c.key)(on ? "true" : "false")} trackColor={{ true: colors.primary }} />
                <View style={{ flex: 1 }}>
                  <Text>{c.label}</Text>
                  {errors[c.key] ? <Text style={{ color: colors.error, fontSize: 14 }}>{errors[c.key]}</Text> : null}
                </View>
              </Pressable>
            ))}
          </>
        ) : null}
        <View style={{ flexDirection: "row", gap: 8 }}>
          {step > 0 ? (
            <View style={{ flex: 1 }}>
              <Button title="السابق" variant="secondary" onPress={() => setStep(step - 1)} />
            </View>
          ) : null}
          <View style={{ flex: 2 }}>
            <Button title={step === STEPS.length - 1 ? "أرسل الطلب" : "التالي"} loading={busy} onPress={() => void next()} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
