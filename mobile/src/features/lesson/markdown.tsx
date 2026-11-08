import { View } from "react-native";
import { Text, fonts } from "@/ui";

/** The same minimal, safe Markdown as the web (paragraphs, "- " lists, **bold**, *italic*). */
function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);
  return (
    <Text style={{ fontSize: 16, lineHeight: 30 }}>
      {parts.map((p, i) =>
        p.startsWith("**") ? (
          <Text key={i} style={{ fontFamily: fonts.bold }}>
            {p.slice(2, -2)}
          </Text>
        ) : p.startsWith("*") && p.endsWith("*") && p.length > 2 ? (
          <Text key={i} style={{ fontStyle: "italic" }}>
            {p.slice(1, -1)}
          </Text>
        ) : (
          p
        ),
      )}
    </Text>
  );
}

export function Markdown({ source }: { source: string }) {
  const blocks = source.trim().split(/\n{2,}/);
  return (
    <View style={{ gap: 12 }}>
      {blocks.map((block, bi) => {
        const lines = block.split("\n");
        if (lines.every((l) => /^\s*[-•]\s+/.test(l))) {
          return (
            <View key={bi} style={{ gap: 4 }}>
              {lines.map((l, li) => (
                <View key={li} style={{ flexDirection: "row", gap: 8 }}>
                  <Text>•</Text>
                  <View style={{ flex: 1 }}>
                    <Inline text={l.replace(/^\s*[-•]\s+/, "")} />
                  </View>
                </View>
              ))}
            </View>
          );
        }
        return (
          <View key={bi}>
            {lines.map((l, li) => (
              <Inline key={li} text={l} />
            ))}
          </View>
        );
      })}
    </View>
  );
}
