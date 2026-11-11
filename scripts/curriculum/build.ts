/**
 * npm run curriculum:build [A1-01 ...] — assembles hand-authored units (scripts/curriculum/<level>/NN.ts)
 * into content/english/units/<code>.json and validates them with the same validator the importer uses.
 */
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { validateUnitPackage } from "../../src/lib/content/validate";
import { DEFAULT_TEMPLATES } from "../../src/lib/factory/templates";
import type { LessonTemplateSpec } from "../../src/lib/factory/templates";
import { assembleUnit, type LessonBuild, type WordItem } from "../../src/lib/factory/build/generate";
import type { SectionContent } from "../../src/lib/factory/build/content";
import type { VideoBlock } from "../../shared/content/types";
import type { Authored } from "./types";

const tpl = (key: string) => DEFAULT_TEMPLATES.find((t) => t.kind === "lesson" && t.key === key)!.spec as LessonTemplateSpec;
const withoutVideo = (t: LessonTemplateSpec): LessonTemplateSpec => ({ ...t, sections: t.sections.filter((s) => s.block !== "video") });

export function buildUnit(a: Authored, prev?: Authored) {
  const words: WordItem[] = a.words.map(([word, pos, meaning_ar, example_en]) => ({ word, pos, meaning_ar, example_en }));
  // Two words from the previous unit come back as review words.
  const review: WordItem[] = (prev?.words ?? []).slice(0, 2).map(([word, pos, meaning_ar, example_en]) => ({ word, pos, meaning_ar, example_en, review: true }));
  const video: VideoBlock = {
    type: "video",
    youtube_id: a.video.id,
    video_title: a.video.title,
    channel: "ZAmericanEnglish",
    channel_url: "https://www.youtube.com/@ZAmericanEnglish",
    optional: false,
    ...(a.video.checked ? {} : { needs_check: true }),
  };
  const noVideo = video; // never used where the template has no video section
  const sec = (o: Record<string, SectionContent>) => o;
  const lessons: LessonBuild[] = [
    {
      template: tpl("vocab"),
      templateKey: "vocab",
      title_ar: `مفردات: ${a.title_ar}`,
      video,
      sections: sec({
        warmup: { block: "text", markdown_ar: a.warmup_ar },
        words: { block: "table", headers: ["الكلمة", "المعنى", "مثال"], rows: a.words.map((w) => [w[0], w[2], w[3]]) },
        in_context: { block: "audio", sentences_en: a.in_context },
      }),
    },
    {
      template: withoutVideo(tpl("grammar")),
      templateKey: "grammar",
      title_ar: `قاعدة: ${a.grammar_en}`,
      video: noVideo,
      sections: sec({
        notice: { block: "audio", sentences_en: a.notice },
        rule: { block: "text", markdown_ar: a.rule_ar },
        form: { block: "table", headers: a.form.headers, rows: a.form.rows },
        write: { block: "writing_task", prompt_en: a.write_prompt, min_words: 12, max_words: 50, rubric_focus: ["correct form", "everyday words"] },
      }),
    },
    {
      template: withoutVideo(tpl("dialogue")),
      templateKey: "dialogue",
      title_ar: "حوار",
      video: noVideo,
      sections: sec({
        before: { block: "text", markdown_ar: a.before_ar },
        dialogue: { block: "story", title_ar: "الحوار", panels: a.dialogue.map(([speaker, text_en, text_ar]) => ({ speaker, text_en, text_ar })) },
        speak: { block: "speaking_task", prompt_en: a.speak.prompt, helpful_phrases: a.speak.phrases, rubric_focus: ["clear pronunciation", "complete sentences"] },
      }),
    },
    {
      template: withoutVideo(tpl("review")),
      templateKey: "review",
      title_ar: "مراجعة الوحدة",
      video: noVideo,
      sections: sec({
        story: { block: "story", title_ar: a.story_title_ar, panels: a.story.map(([speaker, text_en, text_ar]) => ({ speaker, text_en, text_ar })) },
        task: { block: "speaking_task", prompt_en: a.task.prompt, helpful_phrases: a.task.phrases, rubric_focus: ["task completed", "correct grammar"] },
      }),
    },
  ];
  return assembleUnit({
    path: "english",
    code: a.code,
    level: "A1",
    position: a.position,
    title_en: a.title_en,
    title_ar: a.title_ar,
    situation_ar: a.situation_ar,
    stop_ar: a.stop_ar,
    grammar_en: a.grammar_en,
    can_do: a.can_do,
    words: [...words, ...review],
    lessons,
    quiz: { min: 10, max: 10, pass_percent: 70 },
    roleplay: a.roleplay,
  });
}

async function main() {
  const dir = path.join(__dirname, "a1");
  const files = readdirSync(dir).filter((f) => /^\d\d\.ts$/.test(f)).sort();
  const only = process.argv.slice(2);
  const all: Authored[] = [];
  for (const f of files) all.push(((await import(path.join(dir, f))) as { default: Authored }).default);
  const out = path.join(__dirname, "..", "..", "content", "english", "units");
  mkdirSync(out, { recursive: true });
  let bad = 0;
  all.forEach((a, i) => {
    if (only.length && !only.includes(a.code)) return;
    const pkg = buildUnit(a, all[i - 1]);
    const r = validateUnitPackage(pkg, { fileName: `${a.code}.json` });
    console.log(`${r.ok ? "✓" : "✗"} ${a.code} ${a.title_en} (${(r.sizeBytes / 1024).toFixed(0)}KB, ${pkg.quiz.questions.length} quiz)`);
    for (const e of r.errors) console.log(`   خطأ [${e.path}]: ${e.message}`);
    for (const w of r.warnings) console.log(`   تنبيه [${w.path}]: ${w.message}`);
    if (!r.ok) bad++;
    else writeFileSync(path.join(out, `${a.code}.json`), JSON.stringify(pkg, null, 2) + "\n");
  });
  if (bad) process.exit(1);
}
if (require.main === module) void main();
