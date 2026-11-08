import { describe, expect, it } from "vitest";
import { DEFAULT_TEMPLATES, lessonTemplateSpec, missingLessonTemplates, templateErrors, unitTemplateSpec, type LessonTemplateSpec } from "./templates";
import { channelFromUrl, DEFAULT_PROFILE, parseProfile, playlistFromUrl } from "./profile";
import { blocking, checkLevelMap, wordCode, type LevelMap, type MapUnit } from "./curriculum";
import { mapToRows, rowsToMap } from "./rows";

const unitTemplate = unitTemplateSpec.parse(DEFAULT_TEMPLATES.find((t) => t.key === "standard")!.spec);

const words = (list: string[]) => list.map((w) => ({ word: w, pos: "noun" as const, meaning_ar: "معنى", example_en: `This is ${w}.` }));
function unit(n: number, list: string[], extra: Partial<MapUnit> = {}): MapUnit {
  const code = `A1-${String(n).padStart(2, "0")}`;
  return {
    code,
    position: n,
    title_en: `Unit ${n}`,
    title_ar: `الوحدة ${n}`,
    stop_ar: `محطة ${n}`,
    situation_ar: "موقف في المكلا",
    task_ar: "مهمة حقيقية في المكلا",
    objectives: ["O01", "O02"],
    grammar: [`G0${n}`],
    words: words(list),
    review: [],
    source_video: null,
    ...extra,
  };
}
const ten = (p: string) => Array.from({ length: 10 }, (_, i) => `${p}${String.fromCharCode(97 + i)}`);
function map(units: MapUnit[]): LevelMap {
  return {
    level: "A1",
    summary_ar: "خريطة المستوى الأول",
    objectives: [
      { code: "O01", text_ar: "أحيّي وأعرّف بنفسي" },
      { code: "O02", text_ar: "أسأل عن الاسم" },
    ],
    grammar: units.map((_, i) => ({ code: `G0${i + 1}`, text_en: "be", text_ar: "فعل الكون", example_en: "I am Hamza." })),
    units,
  };
}

describe("templates", () => {
  it("ships valid default templates", () => {
    for (const t of DEFAULT_TEMPLATES) expect(templateErrors(t.kind, t.spec), t.key).toEqual([]);
    const lessons = DEFAULT_TEMPLATES.filter((t) => t.kind === "lesson").map((t) => t.key);
    expect(missingLessonTemplates(unitTemplate, lessons)).toEqual([]);
  });

  it("requires exactly one video in every lesson (owner decision)", () => {
    const vocab = DEFAULT_TEMPLATES.find((t) => t.key === "vocab")!.spec as LessonTemplateSpec;
    const noVideo = { ...vocab, sections: vocab.sections.filter((s) => s.block !== "video") };
    expect(lessonTemplateSpec.safeParse(noVideo).success).toBe(false);
    const twoVideos = { ...vocab, sections: [...vocab.sections, { ...vocab.sections[1], key: "watch2" }] };
    expect(templateErrors("lesson", twoVideos).join()).toContain("فيديو");
  });

  it("only lets code generate exercises and games", () => {
    const vocab = DEFAULT_TEMPLATES.find((t) => t.key === "vocab")!.spec as LessonTemplateSpec;
    const bad = { ...vocab, sections: vocab.sections.map((s) => (s.key === "warmup" ? { ...s, source: "code" } : s)) };
    expect(templateErrors("lesson", bad).length).toBeGreaterThan(0);
  });

  it("reports unknown lesson templates in a unit template", () => {
    expect(missingLessonTemplates(unitTemplate, ["vocab", "grammar"])).toEqual(["dialogue", "review"]);
  });
});

describe("path profile", () => {
  it("falls back to defaults on bad data", () => {
    expect(parseProfile({ levels: "x" })).toEqual(DEFAULT_PROFILE);
  });

  it("reads playlist and channel links", () => {
    expect(playlistFromUrl("https://www.youtube.com/playlist?list=PLp22-4PivYmIFAnru_L7fnMhSV5YffLTZ")).toBe("PLp22-4PivYmIFAnru_L7fnMhSV5YffLTZ");
    expect(playlistFromUrl("https://example.com")).toBeNull();
    expect(channelFromUrl("https://www.youtube.com/@bbclearningenglish/videos")).toBe("@bbclearningenglish");
    expect(channelFromUrl("https://www.youtube.com/channel/UCHaHD477h-FeBbVh9Sh7syA")).toBe("UCHaHD477h-FeBbVh9Sh7syA");
    expect(channelFromUrl("https://evil.com/@x")).toBeNull();
  });
});

describe("level map checks", () => {
  it("accepts a sound map", () => {
    const m = map([unit(1, ten("a")), unit(2, ten("b"), { review: ["aa", "ab"] })]);
    expect(blocking(checkLevelMap(m, unitTemplate))).toBe(false);
  });

  it("blocks a word taught twice and review words not taught yet", () => {
    const m = map([unit(1, ten("a")), unit(2, [...ten("b").slice(0, 9), "aa"], { review: ["zz", "ab"] })]);
    const issues = checkLevelMap(m, unitTemplate);
    expect(blocking(issues)).toBe(true);
    expect(issues.some((i) => i.message.includes("«aa» دُرّست"))).toBe(true);
    expect(issues.some((i) => i.message.includes("«zz»"))).toBe(true);
  });

  it("blocks words already taught in earlier levels and wrong counts", () => {
    const issues = checkLevelMap(map([unit(1, ["hello", "name"])]), unitTemplate, ["hello"]);
    expect(issues.some((i) => i.message.includes("مستوى سابق"))).toBe(true);
    expect(issues.some((i) => i.message.includes("عدد الكلمات"))).toBe(true);
  });

  it("warns about repeated stops and unused objectives", () => {
    const m = map([
      unit(1, ten("a"), { objectives: ["O01", "O01"] }),
      unit(2, ten("b"), { stop_ar: "محطة 1", review: ["aa", "ab"], objectives: ["O01", "O01"] }),
    ]);
    const issues = checkLevelMap(m, unitTemplate);
    expect(issues.some((i) => i.severity === "warn" && i.message.includes("تكررت"))).toBe(true);
    expect(issues.some((i) => i.message.includes("O02"))).toBe(true);
  });
});

describe("map rows", () => {
  it("survives a round trip through the database rows", () => {
    const m = map([unit(1, ten("a"), { source_video: { youtube_id: "abcdefghijk", title: "Hello" } }), unit(2, ten("b"), { review: ["aa", "ab"] })]);
    const { items, units } = mapToRows(m);
    expect(items.filter((i) => i.kind === "word")).toHaveLength(20);
    expect(rowsToMap("A1", m.summary_ar, items, units)).toEqual(m);
    expect(wordCode("Good morning!")).toBe("w-good-morning");
  });
});
