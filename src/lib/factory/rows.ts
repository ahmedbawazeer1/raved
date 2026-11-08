/**
 * Converts a level map between its database rows (curriculum_items + curriculum_units) and the
 * LevelMap shape the checks and the agent use. Pure; unit tested.
 */
import { wordCode, type LevelMap, type MapUnit } from "./curriculum";

export interface ItemRow {
  kind: string;
  code: string;
  text_en: string;
  text_ar: string;
  detail: unknown;
  unit_code: string | null;
  position: number;
}

export interface UnitRow {
  code: string;
  position: number;
  title_en: string;
  title_ar: string;
  stop_ar: string;
  situation_ar: string;
  task_ar: string;
  objectives: string[];
  grammar: string[];
  review_words: string[];
  source_video: unknown;
  build_status?: string;
}

const str = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : fallback);
const detailOf = (d: unknown): Record<string, unknown> => (d && typeof d === "object" ? (d as Record<string, unknown>) : {});

export function rowsToMap(level: string, summary: string, items: ItemRow[], units: UnitRow[]): LevelMap {
  const byPos = (a: { position: number }, b: { position: number }) => a.position - b.position;
  const words = items.filter((i) => i.kind === "word").sort(byPos);
  return {
    level,
    summary_ar: summary,
    objectives: items
      .filter((i) => i.kind === "objective")
      .sort(byPos)
      .map((o) => ({ code: o.code, text_ar: o.text_ar })),
    grammar: items
      .filter((i) => i.kind === "grammar")
      .sort(byPos)
      .map((g) => ({ code: g.code, text_en: g.text_en, text_ar: g.text_ar, example_en: str(detailOf(g.detail).example_en) })),
    units: [...units].sort(byPos).map((u) => {
      const video = detailOf(u.source_video);
      return {
        code: u.code,
        position: u.position,
        title_en: u.title_en,
        title_ar: u.title_ar,
        stop_ar: u.stop_ar,
        situation_ar: u.situation_ar,
        task_ar: u.task_ar,
        objectives: u.objectives,
        grammar: u.grammar,
        review: u.review_words,
        source_video: typeof video.youtube_id === "string" ? { youtube_id: video.youtube_id, title: str(video.title) } : null,
        words: words
          .filter((w) => w.unit_code === u.code)
          .map((w) => {
            const d = detailOf(w.detail);
            return {
              word: w.text_en,
              pos: (str(d.pos, "other") as MapUnit["words"][number]["pos"]) ?? "other",
              meaning_ar: w.text_ar,
              example_en: str(d.example_en),
            };
          }),
      };
    }),
  };
}

export function mapToRows(map: LevelMap): { items: ItemRow[]; units: UnitRow[] } {
  const items: ItemRow[] = [];
  map.objectives.forEach((o, i) =>
    items.push({ kind: "objective", code: o.code, text_en: "", text_ar: o.text_ar, detail: {}, unit_code: null, position: i + 1 }),
  );
  map.grammar.forEach((g, i) =>
    items.push({
      kind: "grammar",
      code: g.code,
      text_en: g.text_en,
      text_ar: g.text_ar,
      detail: { example_en: g.example_en },
      unit_code: null,
      position: i + 1,
    }),
  );
  let n = 0;
  const seen = new Set<string>();
  for (const u of map.units) {
    for (const w of u.words) {
      const code = wordCode(w.word);
      if (seen.has(code)) continue; // a duplicate is reported by checkLevelMap; keep the first
      seen.add(code);
      items.push({
        kind: "word",
        code,
        text_en: w.word.trim(),
        text_ar: w.meaning_ar,
        detail: { pos: w.pos, example_en: w.example_en },
        unit_code: u.code,
        position: ++n,
      });
    }
  }
  const units: UnitRow[] = map.units.map((u) => ({
    code: u.code,
    position: u.position,
    title_en: u.title_en,
    title_ar: u.title_ar,
    stop_ar: u.stop_ar,
    situation_ar: u.situation_ar,
    task_ar: u.task_ar,
    objectives: u.objectives,
    grammar: u.grammar,
    review_words: u.review,
    source_video: u.source_video ?? null,
  }));
  return { items, units };
}
