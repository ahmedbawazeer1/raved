/**
 * Hand-authored unit source (written by the developer, not by an AI model at run time).
 * `build.ts` turns it into a full unit package with the factory's own code generators
 * (exercises, games and the quiz are made from the sentences and words, so answers are always right).
 */
export type Pos = "noun" | "verb" | "adjective" | "adverb" | "phrase" | "other";
/** word, part of speech, Arabic meaning, example sentence */
export type W = [string, Pos, string, string];
/** speaker, English line, Arabic line */
export type P = [string, string, string];

export interface Authored {
  code: string;
  position: number;
  title_en: string;
  title_ar: string;
  stop_ar: string;
  situation_ar: string;
  grammar_en: string;
  can_do: string[];
  /** The episode of the ZAmericanEnglish playlist; `checked` = its topic was confirmed from its title. */
  video: { id: string; title: string; checked: boolean };
  words: W[];
  warmup_ar: string;
  in_context: string[];
  notice: string[];
  rule_ar: string;
  form: { headers: string[]; rows: string[][] };
  write_prompt: string;
  before_ar: string;
  dialogue: P[];
  speak: { prompt: string; phrases: string[] };
  story_title_ar: string;
  story: P[];
  task: { prompt: string; phrases: string[] };
  roleplay: { character_ar: string; scenario_en: string; opening_en: string };
}
