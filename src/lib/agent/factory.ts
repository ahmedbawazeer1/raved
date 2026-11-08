/**
 * «مصنع المحتوى» job factory_unit: builds ONE unit of an approved level map, station by station —
 * the video of every lesson → the text of every lesson (from its template, around its video part)
 * → exercises, games and quiz in code → gate 1 (code checks) → gate 2 (the critic, one rewrite of a
 * weak lesson) → review. Every finished station is saved in the job, so quota or a busy model only
 * costs the station it stopped on. The next unit is queued only after this one is approved.
 */
import type { UnitPackage } from "@shared/content/types";
import type { VideoCandidate } from "./youtube";
import { external } from "./constitution";
import type { MapUnit } from "../factory/curriculum";
import type { LevelProfile, PathProfile } from "../factory/profile";
import type { LessonTemplateSpec, UnitTemplateSpec } from "../factory/templates";
import { assembleUnit, type LessonBuild, type UnitAssembly, type WordItem } from "../factory/build/generate";
import { lessonPrompt, parseLessonContent, roleplaySchema, type SectionContent } from "../factory/build/content";
import {
  choosePrompt,
  chooseSchema,
  episodePrompt,
  episodeSchema,
  fitPart,
  toVideoBlock,
  videoQueries,
  watchPrompt,
  watchSchema,
  type ChosenVideo,
  type LessonNeed,
} from "../factory/build/video";
import { critiqueNote, critiquePrompt, critiqueSchema, failingLessons, gateOne, type Critique, type QaIssue } from "../factory/build/qa";

export interface FactorySource {
  kind: "playlist" | "channel";
  ref: string;
  title: string;
  language: "ar" | "en";
}

export interface UnitContext {
  pathSlug: string;
  pathTitle: string;
  level: { id: string; code: string };
  unitRowId: string;
  unit: MapUnit;
  objectives: string[];
  grammar: { text_en: string; text_ar: string; example_en: string }[];
  /** Review words with their meaning and example (from earlier units' maps). */
  review: WordItem[];
  /** Every word the student knows by the end of this unit (for gate 1). */
  known: string[];
  profile: PathProfile;
  levelProfile: LevelProfile | null;
  unitTemplate: UnitTemplateSpec;
  lessonTemplates: Record<string, { title_ar: string; spec: LessonTemplateSpec }>;
  sources: FactorySource[];
}

export interface FactoryTools {
  search: (query: string, opts?: { channelId?: string; language?: "ar" | "en"; minSec?: number; maxSec?: number }) => Promise<VideoCandidate[]>;
  playlist?: (playlistId: string) => Promise<{ youtube_id: string; title: string }[]>;
  resolveChannel?: (ref: string) => Promise<string | null>;
  validate: (pkg: unknown) => { ok: boolean; errors: { path: string; message: string }[] };
}

export interface FactoryOutput {
  package: UnitPackage;
  factory: {
    curriculum_unit_id: string;
    lessons: {
      key: string;
      template: string;
      spec: LessonTemplateSpec;
      title_ar: string;
      sections: Record<string, SectionContent>;
      video: ChosenVideo | null;
    }[];
    roleplay: UnitPackage["roleplay"] | null;
    qa: { issues: QaIssue[]; critique: Critique | null; rewritten: number[] };
    /** Everything else the package is assembled from (to re-assemble after a reviewer's edit). */
    assembly: Omit<UnitAssembly, "lessons">;
    known: string[];
  };
}

export interface FactoryPartial {
  videos?: Record<string, ChosenVideo | null>;
  lessons?: Record<string, { title_ar: string; sections: Record<string, SectionContent> }>;
  roleplay?: UnitPackage["roleplay"] | null;
  critique?: Critique | null;
  rewritten?: number[];
}

type Ask = <T>(
  req: { system: string; prompt: string; json?: boolean; youtubeUrl?: string; temperature?: number },
  check: (v: unknown) => { ok: true; value: T } | { ok: false; errors: string[] },
) => Promise<{ value: T; model: string }>;
type Note = (msg: string, patch?: Record<string, unknown>) => Promise<void>;

export interface PlannedLesson {
  key: string;
  template: string;
  title_ar: string;
  spec: LessonTemplateSpec;
  need: LessonNeed;
}

export function plannedLessons(ctx: UnitContext): PlannedLesson[] {
  return ctx.unitTemplate.lessons.flatMap((l, i) => {
    const t = ctx.lessonTemplates[l.template];
    if (!t) return [];
    const video = t.spec.sections.find((s) => s.block === "video");
    const key = `${i + 1}-${l.template}`;
    return [
      { key, template: l.template, title_ar: t.title_ar, spec: t.spec, need: { key: l.template, title_ar: t.title_ar, guide_en: video?.guide_en ?? "" } },
    ];
  });
}

const ok = <T>(value: T) => ({ ok: true as const, value });
const fail = (errors: string[]) => ({ ok: false as const, errors });

/** Picks and watches the videos of all lessons that still need one. */
async function chooseVideos(
  ctx: UnitContext,
  lessons: PlannedLesson[],
  saved: Record<string, ChosenVideo | null>,
  ask: Ask,
  tools: FactoryTools,
  system: string,
  note: Note,
  save: () => Promise<void>,
) {
  const rules = ctx.profile.video;
  const language = ctx.levelProfile?.video_language ?? "en";
  const missing = lessons.filter((l) => !(l.key in saved));
  if (!missing.length) return;

  // The unit's own episode (a level that follows a playlist): one watch, split across the lessons.
  const episode = ctx.unit.source_video;
  if (episode && missing.length === lessons.length) {
    await note(`أشاهد حلقة الوحدة «${episode.title}» وأقسّمها على الدروس`, { progress: 15, step: "videos" });
    const res = await ask(
      {
        system,
        prompt: episodePrompt(
          ctx.unit,
          lessons.map((l) => ({ ...l.need, key: l.key })),
          ctx.level.code,
        ),
        json: true,
        youtubeUrl: `https://www.youtube.com/watch?v=${episode.youtube_id}`,
        temperature: 0.3,
      },
      (v) => {
        const r = episodeSchema.safeParse(v);
        if (!r.success) return fail(r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`));
        const errors = lessons.flatMap((l) => {
          const part = r.data.parts[l.key];
          if (!part) return [`parts.${l.key} is missing`];
          const f = fitPart(part, r.data.duration_sec, { ...rules, min_sec: Math.min(rules.min_sec, 45) });
          return f.ok ? [] : [`parts.${l.key}: ${f.error}`];
        });
        return errors.length ? fail(errors) : ok(r.data);
      },
    ).catch(() => null);
    if (res?.value.suitable) {
      for (const l of lessons) {
        const f = fitPart(res.value.parts[l.key], res.value.duration_sec, { ...rules, min_sec: Math.min(rules.min_sec, 45) });
        if (f.ok) saved[l.key] = { youtube_id: episode.youtube_id, title: episode.title, channel: ctx.sources[0]?.title ?? "", part: f.part, alternatives: [] };
      }
      await save();
    } else if (res) await note(`حلقة الوحدة غير مناسبة (${res.value.concerns_ar ?? ""})، أبحث عن فيديوهات أخرى`);
  }

  const sources = ctx.sources.filter((s) => s.language === language).concat(ctx.sources.filter((s) => s.language !== language));
  for (const [i, l] of lessons.entries()) {
    if (l.key in saved) continue;
    await note(`أبحث عن فيديو «${l.title_ar}» في المصادر الموثوقة`, { progress: 15 + Math.round((25 * i) / lessons.length), step: "videos" });
    const queries = videoQueries(ctx.unit, ctx.grammar[0]?.text_en ?? ctx.unit.title_en, l.need, language);
    const found = new Map<string, VideoCandidate>();
    for (const s of sources) {
      if (found.size >= 8) break;
      if (s.kind === "channel" && tools.resolveChannel) {
        const channelId = await tools.resolveChannel(s.ref);
        if (channelId)
          for (const c of await tools.search(queries[0], { channelId, language, minSec: rules.min_sec, maxSec: rules.max_sec * 4 })) found.set(c.id, c);
      }
    }
    if (found.size < 3)
      for (const c of await tools.search(queries[queries.length - 1], { language, minSec: rules.min_sec, maxSec: rules.max_sec * 4 })) found.set(c.id, c);
    const candidates = [...found.values()].filter((c) => !rules.captions_required || c.captions || language === "ar");
    if (!candidates.length) {
      saved[l.key] = null;
      await save();
      continue;
    }
    const ranked = await ask(
      { system, prompt: choosePrompt(ctx.unit, l.need, ctx.level.code, language, candidates, rules.candidates), json: true, temperature: 0.2 },
      (v) => {
        const r = chooseSchema.safeParse(v);
        if (!r.success) return fail(r.error.issues.map((x) => x.message));
        const ids = r.data.video_ids.filter((id) => found.has(id));
        return ids.length ? ok(ids) : fail(["choose ids from the list"]);
      },
    );
    let chosen: ChosenVideo | null = null;
    for (const id of ranked.value.slice(0, 2)) {
      const c = found.get(id)!;
      const watched = await ask(
        {
          system,
          prompt: watchPrompt(ctx.unit, l.need, ctx.level.code, rules),
          json: true,
          youtubeUrl: `https://www.youtube.com/watch?v=${id}`,
          temperature: 0.3,
        },
        (v) => {
          const r = watchSchema.safeParse(v);
          if (!r.success) return fail(r.error.issues.map((x) => `${x.path.join(".")}: ${x.message}`));
          if (!r.data.suitable) return ok(r.data);
          const f = fitPart(r.data.part, r.data.duration_sec, rules);
          return f.ok ? ok({ ...r.data, part: f.part }) : fail([f.error]);
        },
      ).catch(() => null);
      if (watched?.value.suitable && watched.value.rating >= 3) {
        chosen = {
          youtube_id: id,
          title: c.title,
          channel: c.channel,
          rating: watched.value.rating,
          part: watched.value.part,
          alternatives: ranked.value
            .filter((x) => x !== id)
            .slice(0, 2)
            .map((x) => ({ youtube_id: x, title: found.get(x)!.title, channel: found.get(x)!.channel })),
        };
        break;
      }
    }
    saved[l.key] = chosen;
    await save();
  }
}

export async function buildFactoryUnit(
  job: { id: string; input: Record<string, unknown> },
  ctx: UnitContext,
  memory: string[],
  system: string,
  ask: Ask,
  tools: FactoryTools,
  note: Note,
  saveInput: (p: FactoryPartial) => Promise<void>,
): Promise<FactoryOutput> {
  const partial: FactoryPartial = (job.input.partial ?? {}) as FactoryPartial;
  const lessons = plannedLessons(ctx);
  const videos: Record<string, ChosenVideo | null> = { ...(partial.videos ?? {}) };
  const written: NonNullable<FactoryPartial["lessons"]> = { ...(partial.lessons ?? {}) };
  let roleplay = partial.roleplay ?? null;
  let critique: Critique | null | undefined = partial.critique;
  const rewritten = [...(partial.rewritten ?? [])];
  const save = () => saveInput({ videos, lessons: written, roleplay, critique, rewritten });
  void memory;

  await chooseVideos(ctx, lessons, videos, ask, tools, system, note, save);

  const words: WordItem[] = [...ctx.unit.words, ...ctx.review];
  const feedback = typeof job.input.feedback === "string" ? job.input.feedback : undefined;
  const write = async (l: PlannedLesson, i: number, extra?: string) => {
    const v = videos[l.key];
    const last = i === lessons.length - 1;
    const res = await ask(
      {
        system,
        prompt: lessonPrompt({
          path: ctx.pathTitle,
          level: ctx.level.code,
          unit: ctx.unit,
          grammar: ctx.grammar,
          objectives: ctx.objectives,
          words,
          lesson: { n: i + 1, total: lessons.length, key: l.key, title_ar: l.title_ar, template: l.spec },
          video: v ? { title: v.title, summary: v.part.summary_en, sentences: v.part.key_sentences } : undefined,
          before: lessons.slice(0, i).map((x) => written[x.key]?.title_ar ?? x.title_ar),
          feedback: [feedback, extra].filter(Boolean).join(" | ") || undefined,
          withRoleplay: last && !roleplay,
        }),
        json: true,
        temperature: 0.6,
      },
      (raw) => {
        const r = parseLessonContent(l.spec, raw);
        if (!r.ok) return fail(r.errors);
        const rp = last && !roleplay ? roleplaySchema.safeParse((raw as { roleplay?: unknown }).roleplay) : null;
        return ok({ ...r, roleplay: rp?.success ? rp.data : null });
      },
    );
    written[l.key] = { title_ar: res.value.title_ar, sections: res.value.sections };
    if (res.value.roleplay) roleplay = res.value.roleplay;
    await save();
  };
  for (const [i, l] of lessons.entries()) {
    if (written[l.key]) continue;
    await note(`أكتب ${l.title_ar} (${i + 1} من ${lessons.length})`, { progress: 45 + Math.round((30 * i) / lessons.length), step: "lessons" });
    await write(l, i);
  }

  const base: Omit<UnitAssembly, "lessons"> = {
    path: ctx.pathSlug,
    code: ctx.unit.code,
    level: ctx.level.code,
    position: ctx.unit.position,
    title_en: ctx.unit.title_en,
    title_ar: ctx.unit.title_ar,
    situation_ar: ctx.unit.situation_ar,
    stop_ar: ctx.unit.stop_ar,
    grammar_en: ctx.grammar.map((g) => g.text_en).join("; ") || "review",
    can_do: ctx.objectives,
    words,
    quiz: ctx.unitTemplate.quiz,
  };
  const assemble = (): UnitPackage =>
    assembleUnit({
      ...base,
      roleplay: roleplay ?? undefined,
      lessons: lessons.map(
        (l): LessonBuild => ({
          template: l.spec,
          templateKey: l.template,
          title_ar: written[l.key].title_ar,
          sections: written[l.key].sections,
          video: videos[l.key] ? toVideoBlock(videos[l.key]!) : { type: "video", optional: false },
        }),
      ),
    });
  let pkg = assemble();
  // Gate 2: the critic, and one rewrite of each weak lesson with its notes.
  if (critique === undefined) {
    await note("المراجع الآلي يقيّم الدروس", { progress: 80, step: "critic" });
    const res = await ask(
      { system, prompt: critiquePrompt(pkg, ctx.level.code, ctx.profile.quality.criteria, ctx.objectives), json: true, temperature: 0.2 },
      (v) => {
        const r = critiqueSchema.safeParse(v);
        return r.success ? ok(r.data) : fail(r.error.issues.map((x) => `${x.path.join(".")}: ${x.message}`));
      },
    ).catch(() => null);
    critique = res?.value ?? null;
    await save();
    for (const weak of critique ? failingLessons(critique, ctx.profile.quality.min_score) : []) {
      const l = lessons[weak.position - 1];
      if (!l || rewritten.includes(weak.position)) continue;
      await note(`أعيد كتابة «${written[l.key].title_ar}» بملاحظات المراجع الآلي`, { progress: 88, step: "rewrite" });
      await write(l, weak.position - 1, `the quality reviewer found: ${external(critiqueNote(weak), 1200)}`);
      rewritten.push(weak.position);
      await save();
    }
    pkg = assemble();
  }

  // Gate 1: the code checks (always on the final package).
  const issues = gateOne({ pkg, words, known: ctx.known, quizMin: ctx.unitTemplate.quiz.min, schemaErrors: tools.validate(pkg).errors });
  for (const l of lessons)
    if (!videos[l.key])
      issues.unshift({ severity: "error", lesson: lessons.indexOf(l) + 1, message: "لم يُعثر على فيديو مناسب: اختر فيديو للدرس في المراجعة" });

  return {
    package: pkg,
    factory: {
      curriculum_unit_id: ctx.unitRowId,
      lessons: lessons.map((l) => ({
        key: l.key,
        template: l.template,
        spec: l.spec,
        title_ar: written[l.key].title_ar,
        sections: written[l.key].sections,
        video: videos[l.key] ?? null,
      })),
      roleplay,
      qa: { issues, critique: critique ?? null, rewritten },
      assembly: base,
      known: ctx.known,
    },
  };
}

/** A video picked by a reviewer: watched once to get its part and surprise questions (kept even if the model hesitates). */
export async function watchChosen(ctx: UnitContext, lesson: PlannedLesson, videoId: string, ask: Ask): Promise<ChosenVideo> {
  const rules = ctx.profile.video;
  const res = await ask(
    {
      system: "",
      prompt: watchPrompt(ctx.unit, lesson.need, ctx.level.code, rules),
      json: true,
      youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
      temperature: 0.3,
    },
    (v) => {
      const r = watchSchema.safeParse(v);
      if (!r.success) return fail(r.error.issues.map((x) => `${x.path.join(".")}: ${x.message}`));
      const f = fitPart(r.data.part, r.data.duration_sec, { ...rules, min_sec: 20, max_sec: Math.max(rules.max_sec, r.data.duration_sec) });
      return f.ok ? ok({ ...r.data, part: f.part }) : fail([f.error]);
    },
  );
  return { youtube_id: videoId, title: "", channel: "", rating: res.value.rating, part: res.value.part, alternatives: [] };
}
