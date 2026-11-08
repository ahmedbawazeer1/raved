import { useState } from "react";
import { Pressable, View } from "react-native";
import type { AudioBlock, ReadingBlock, StoryBlock, TableBlock } from "@shared/content/types";
import { companionMarkup } from "@shared/art/companion";
import { fx } from "@/lib/fx";
import { speak } from "@/lib/speech";
import { Art, Button, colors, fonts, radius, Text } from "@/ui";
import { markSolved } from "./solved";

/** «استمع»: the phone reads the English text aloud. */
export function Audio({ block }: { block: AudioBlock }) {
  if (!block.text_en) return null;
  return (
    <View style={{ backgroundColor: colors.card, borderRadius: radius.lg, padding: 16, gap: 10, borderWidth: 1, borderColor: colors.border }}>
      <Text variant="en">{block.text_en}</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Button title="🔊 استمع" variant="secondary" onPress={() => speak(block.text_en!)} />
        </View>
        <View style={{ flex: 1 }}>
          <Button title="🐢 ببطء" variant="secondary" onPress={() => speak(block.text_en!, 0.6)} />
        </View>
      </View>
    </View>
  );
}

export function Reading({ block }: { block: ReadingBlock }) {
  if (!block.text_en) return null;
  return (
    <View style={{ backgroundColor: colors.card, borderRadius: radius.lg, padding: 16, gap: 10, borderWidth: 1, borderColor: colors.border }}>
      <Text variant="en" style={{ lineHeight: 28 }}>
        {block.text_en}
      </Text>
      <Button title="🔊 استمع للنص" variant="secondary" onPress={() => speak(block.text_en!)} />
    </View>
  );
}

export function Table({ block }: { block: TableBlock }) {
  const rows = [block.headers ?? [], ...(block.rows ?? [])].filter((r) => r.length);
  return (
    <View style={{ borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, overflow: "hidden" }}>
      {rows.map((r, i) => (
        <View
          key={i}
          style={{
            flexDirection: "row",
            backgroundColor: i === 0 && block.headers ? colors.primaryTint : colors.card,
            borderTopWidth: i ? 1 : 0,
            borderTopColor: colors.border,
          }}
        >
          {r.map((c, j) => (
            <Text
              key={j}
              variant={/[A-Za-z]/.test(c) ? "en" : "body"}
              style={{ flex: 1, padding: 8, fontSize: 14, fontFamily: i === 0 && block.headers ? fonts.semibold : undefined }}
            >
              {c}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

/** «رحلة حمزة وريم»: the unit's situation told in short panels; reading to the end counts as an activity. */
export function Story({ block, solved }: { block: StoryBlock; solved: boolean }) {
  const panels = block.panels ?? [];
  const [i, setI] = useState(solved ? panels.length - 1 : 0);
  const [showAr, setShowAr] = useState(false);
  if (!panels.length) return null;
  const p = panels[i];
  const reem = /reem|ريم/i.test(p.speaker);
  const last = i === panels.length - 1;
  return (
    <View style={{ backgroundColor: colors.card, borderRadius: radius.xl, padding: 16, gap: 12, borderWidth: 1, borderColor: colors.border }}>
      {block.title_ar ? <Text variant="heading">{block.title_ar}</Text> : null}
      <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-end" }}>
        <Art markup={companionMarkup({ who: reem ? "reem" : "hamza", mood: "happy" })} viewBox="0 0 120 160" width={60} height={80} />
        <View style={{ flex: 1, backgroundColor: colors.primaryTint, borderRadius: 16, padding: 12, gap: 4 }}>
          <Text variant="small">{p.speaker}</Text>
          <Text variant="en" style={{ fontFamily: fonts.enBold }}>
            {p.text_en}
          </Text>
          {showAr ? <Text variant="muted">{p.text_ar}</Text> : null}
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable onPress={() => speak(p.text_en)} style={{ minHeight: 44, paddingHorizontal: 12, justifyContent: "center" }}>
          <Text style={{ color: colors.primary }}>🔊 استمع</Text>
        </Pressable>
        <Pressable onPress={() => setShowAr(!showAr)} style={{ minHeight: 44, paddingHorizontal: 12, justifyContent: "center" }}>
          <Text style={{ color: colors.primary }}>{showAr ? "أخفِ الترجمة" : "الترجمة"}</Text>
        </Pressable>
        <Text variant="small" style={{ marginStart: "auto", alignSelf: "center" }}>
          {i + 1} / {panels.length}
        </Text>
      </View>
      <Button
        title={last ? (solved ? "قرأت القصة ✅" : "أنهيت القصة") : "التالي"}
        onPress={() => {
          if (!last) {
            setI(i + 1);
            setShowAr(false);
            fx("pop");
          } else if (block.id && !solved) {
            markSolved(block.id);
            fx("coin");
          }
        }}
      />
    </View>
  );
}
