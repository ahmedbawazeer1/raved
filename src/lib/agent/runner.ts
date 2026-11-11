/**
 * The background runner of «عقل رفد» (unit tested with a fake database and model).
 * Takes the oldest queued job, runs it step by step, records progress and leaves the result
 * for the owner's review. Used by scripts/agent/run.ts (GitHub Actions, service role).
 */
import { PROMPT_VERSION, systemPrompt } from "./constitution";
import { YouTubeError, type VideoCandidate } from "./youtube";
import { GeminiError, parseJsonAnswer, type GeminiRequest, type GeminiResult } from "./gemini";
import { improvePrompt, type UnitStats } from "./improve";
import {
  countUnits,
  levelUnitsPrompt,
  levelUnitsSchema,
  outlinePrompt,
  outlineSchema,
  pathPlanSchema,
  planErrors,
  type PathContext,
  type PathPlan,
  type PlanOutline,
} from "./plan";
import {
  buildUnitPrompt,
  choiceSchema,
  chooseClipPrompt,
  chooseVideoPrompt,
  clipChoiceSchema,
  clipInstructions,
  clipQueries,
  parseBuildInput,
  searchQueries,
  timelineSchema,
  watchPrompt,
  type ClipChoice,
} from "./unit";

import {
  batchErrors,
  batchPrompt,
  BATCH,
  batchSchema,
  frameSchema,
  framePrompt,
  partialMap,
  placeBatch,
  unitCount,
  type LevelContext,
  type LevelFrame,
  type PlaylistVideo,
} from "./level";
import { checkLevelMap, type LevelMap, type MapIssue, type MapUnit } from "../factory/curriculum";
import { buildFactoryUnit, plannedLessons, watchChosen, type FactoryOutput, type FactoryPartial, type UnitContext } from "./factory";

export interface AgentJob {
  id: string;
  kind: "plan_path" | "build_unit" | "improve_unit" | "plan_level" | "factory_unit" | "factory_lesson";
  path_id: string;
  input: Record<string, unknown>;
  log: { at: string; msg: string }[];
}

/** What the runner needs from the database (Supabase with the service role in production). */
export interface AgentStore {
  nextQueued(): Promise<AgentJob | null>;
  update(id: string, patch: Record<string, unknown>): Promise<void>;
  pathContext(pathId: string): Promise<PathContext>;
  memory(pathId: string): Promise<string[]>;
  /** The latest package of a published unit (for improve_unit). */
  unitPackage?(unitId: string): Promise<{ package: Record<string, unknown>; version: number } | null>;
  /** The owner's «أوقف الوكيل» switch. */
  paused?(): Promise<boolean>;
  /** Saves one trace row (model or search call). */
  trace?(row: AgentTrace): Promise<void>;
  /** plan_level: what the level map is planned from (path profile, unit template, earlier levels). */
  levelContext?(levelId: string): Promise<LevelContext>;
  /** plan_level: replaces the level's draft map and puts it in review. */
  saveLevelMap?(levelId: string, map: LevelMap, issues: MapIssue[], jobId: string): Promise<void>;
  /** factory_unit: everything one unit is built from. */
  unitContext?(curriculumUnitId: string): Promise<UnitContext>;
  /** factory_unit: the unit's build status in the level map. */
  setBuildStatus?(curriculumUnitId: string, status: "building" | "review" | "failed", jobId: string): Promise<void>;
  /** factory_unit: after a unit reaches review, start the next one if the rules allow (build one ahead). */
  queueNext?(curriculumUnitId: string): Promise<void>;
  /** factory_lesson: the output of the unit build it revises. */
  jobOutput?(jobId: string): Promise<unknown>;
}

export interface AgentTrace {
  job_id: string;
  kind: "model" | "search";
  step: string | null;
  model: string | null;
  prompt_version: string;
  input_chars: number;
  output_chars: number;
  ms: number;
  ok: boolean;
  error: string | null;
}

/** Hard limits for one job: a loop or a stuck provider stops here instead of using up the free quota. */
export const JOB_BUDGET = { modelCalls: 20, searches: 12, minutes: 25 };
/** A level map is planned in ~6 short steps with up to two retries each. */
export const LEVEL_BUDGET = { modelCalls: 30, searches: 4, minutes: 25 };
/** A unit: ~4 videos (choose + watch), 4 lessons, the critic and up to 2 rewrites, with retries. */
export const UNIT_BUDGET = { modelCalls: 36, searches: 24, minutes: 40 };

/** Thrown when a job goes over JOB_BUDGET or the owner pauses the agent mid-job. */
export class AgentStop extends Error {
  constructor(
    public code: "budget" | "paused",
    message: string,
  ) {
    super(message);
  }
}

export type Model = (req: GeminiRequest) => Promise<GeminiResult>;

/** Tools for building units (YouTube search, the package validator and the format reference). */
export interface UnitTools {
  search: (query: string, opts?: { channelId?: string; language?: "ar" | "en"; minSec?: number; maxSec?: number }) => Promise<VideoCandidate[]>;
  /** A channel id from a stored @handle (cheap). */
  resolveChannel?: (ref: string) => Promise<string | null>;
  /** The videos of a YouTube playlist, in order (cheap: no search quota). */
  playlist?: (playlistId: string) => Promise<PlaylistVideo[]>;
  validate: (pkg: unknown) => { ok: boolean; errors: { path: string; message: string }[] };
  schema: string;
  example: string;
}

export const ERROR_AR: Record<string, string> = {
  not_configured: "مفتاح Gemini غير مضاف بعد (GEMINI_API_KEY).",
  quota: "انتهت حصة Gemini المجانية لليوم. سيعيد الوكيل المحاولة لاحقاً.",
  busy: "خوادم Gemini المجانية مزدحمة الآن. سيعيد الوكيل المحاولة في التشغيل التالي.",
  blocked: "رفض Gemini الطلب لأسباب أمان.",
  bad_response: "رد Gemini بشكل غير متوقع.",
  network: "تعذر الاتصال بـ Gemini.",
  youtube_quota: "انتهت حصة YouTube المجانية لليوم. سيكمل الوكيل غداً تلقائياً.",
  youtube_config:
    "مفتاح YouTube لا يعمل: تأكد أن YouTube Data API v3 مفعّلة في مشروع المفتاح على Google Cloud، وأن المفتاح غير مقيّد بمواقع. سيعيد الوكيل المحاولة كل نصف ساعة.",
};

/** A job that ran out of time but saved new steps is put back in the queue this many times at most. */
export const MAX_TIME_RESUMES = 4;

export async function runNextJob(rawStore: AgentStore, rawModel: Model, rawTools?: UnitTools, now: () => Date = () => new Date()): Promise<string | null> {
  if (await rawStore.paused?.()) return null;
  const job = await rawStore.nextQueued();
  if (!job) return null;
  // Remember the latest saved input (the finished steps), so a time stop can requeue the job with it.
  let latestInput = job.input;
  let savedSteps = false;
  const store: AgentStore = {
    ...rawStore,
    update: (id, patch) => {
      if (patch.input && typeof patch.input === "object") {
        latestInput = patch.input as Record<string, unknown>;
        savedSteps = true;
      }
      return rawStore.update(id, patch);
    },
  };
  const log = [...job.log];
  let step: string | null = "start";
  const note = async (msg: string, patch: Record<string, unknown> = {}) => {
    log.push({ at: now().toISOString(), msg });
    if (typeof patch.step === "string") step = patch.step;
    await store.update(job.id, { log, ...patch });
  };

  // Every model and search call is counted, timed and traced; the job stops at its budget or a pause.
  const startedAt = now().getTime();
  let modelCalls = 0;
  let searches = 0;
  const trace = (row: Omit<AgentTrace, "job_id" | "step" | "prompt_version">) =>
    store.trace?.({ job_id: job.id, step, prompt_version: PROMPT_VERSION, ...row }).catch(() => {});
  const budget = job.kind === "plan_level" ? LEVEL_BUDGET : job.kind === "factory_unit" || job.kind === "factory_lesson" ? UNIT_BUDGET : JOB_BUDGET;
  const guard = async (kind: "model" | "search") => {
    const count = kind === "model" ? ++modelCalls : ++searches;
    const max = kind === "model" ? budget.modelCalls : budget.searches;
    if (count > max) throw new AgentStop("budget", `${kind === "model" ? "Gemini" : "YouTube"} calls > ${max}`);
    if (now().getTime() - startedAt > budget.minutes * 60_000) throw new AgentStop("budget", `> ${budget.minutes} min`);
    if (await store.paused?.()) throw new AgentStop("paused", "paused by the owner");
  };
  const model: Model = async (req) => {
    await guard("model");
    const t0 = Date.now();
    const input = req.system.length + req.prompt.length;
    try {
      const res = await rawModel(req);
      await trace({ kind: "model", model: res.model, input_chars: input, output_chars: res.text.length, ms: Date.now() - t0, ok: true, error: null });
      return res;
    } catch (e) {
      await trace({
        kind: "model",
        model: null,
        input_chars: input,
        output_chars: 0,
        ms: Date.now() - t0,
        ok: false,
        error: String(e instanceof Error ? e.message : e).slice(0, 500),
      });
      throw e;
    }
  };
  const tools: UnitTools | undefined = rawTools && {
    ...rawTools,
    resolveChannel:
      rawTools.resolveChannel &&
      (async (ref) => {
        await guard("search");
        return rawTools.resolveChannel!(ref);
      }),
    search: async (q, opts) => {
      await guard("search");
      const t0 = Date.now();
      try {
        const found = await rawTools.search(q, opts);
        await trace({ kind: "search", model: null, input_chars: q.length, output_chars: found.length, ms: Date.now() - t0, ok: true, error: null });
        return found;
      } catch (e) {
        await trace({
          kind: "search",
          model: null,
          input_chars: q.length,
          output_chars: 0,
          ms: Date.now() - t0,
          ok: false,
          error: String(e instanceof Error ? e.message : e).slice(0, 500),
        });
        throw e;
      }
    },
    playlist:
      rawTools.playlist &&
      (async (id) => {
        await guard("search");
        const t0 = Date.now();
        const found = await rawTools.playlist!(id);
        await trace({ kind: "search", model: null, input_chars: id.length, output_chars: found.length, ms: Date.now() - t0, ok: true, error: null });
        return found;
      }),
  };

  const markFailed = async () => {
    if ((job.kind === "factory_unit" || job.kind === "factory_lesson") && typeof job.input.curriculum_unit_id === "string")
      await store.setBuildStatus?.(job.input.curriculum_unit_id, "failed", job.id).catch(() => {});
  };

  await note("بدأ العمل", { status: "running", started_at: now().toISOString(), progress: 5, step: "start" });
  try {
    if (job.kind === "build_unit") {
      if (!tools) throw new Error("unit tools are not available");
      await buildUnit(job, store, model, tools, note, now);
      return job.id;
    }
    if (job.kind === "improve_unit") {
      if (!tools) throw new Error("unit tools are not available");
      await improveUnit(job, store, model, tools, note, now);
      return job.id;
    }
    if (job.kind === "plan_level") {
      await planLevel(job, store, model, tools, note);
      return job.id;
    }
    if (job.kind === "factory_unit" || job.kind === "factory_lesson") {
      await factoryUnit(job, store, model, tools, note);
      return job.id;
    }
    if (job.kind !== "plan_path") throw new Error(`unsupported job kind: ${job.kind}`);
    const [path, memory] = await Promise.all([store.pathContext(job.path_id), store.memory(job.path_id)]);
    await note(`أقرأ المسار «${path.title}» و${memory.length} ملاحظة من مراجعاتك`, { progress: 15, step: "context" });

    const feedback = typeof job.input.feedback === "string" ? job.input.feedback : undefined;
    const system = systemPrompt(memory);
    // Two short steps instead of one huge answer: the levels first, then the units of each level.
    // Finished steps are saved in the job, so a busy or used-up free tier only costs the step it stopped on.
    const saved = outlineSchema.safeParse((job.input.partial as { outline?: unknown } | undefined)?.outline);
    const savedLevels = saved.success ? ((job.input.partial as { levels?: PathPlan["levels"] }).levels ?? []) : [];
    let outline: { value: PlanOutline; model: string };
    if (saved.success) {
      outline = { value: saved.data, model: typeof job.input.partial_model === "string" ? job.input.partial_model : "" };
      await note(`أكمل من حيث توقفت: ${savedLevels.length} من ${saved.data.levels.length} مستويات جاهزة`, { progress: 20, step: "outline" });
    } else {
      await note("أصمّم المستويات", { progress: 20, step: "outline" });
      outline = await askJson(model, { system, prompt: outlinePrompt(path, feedback), json: true, temperature: 0.5 }, zodCheck(outlineSchema));
    }
    const levels: PathPlan["levels"] = [...savedLevels];
    const save = () => store.update(job.id, { input: { ...job.input, partial: { outline: outline.value, levels }, partial_model: outline.model } });
    if (!saved.success) await save();
    for (const [i, level] of outline.value.levels.entries()) {
      if (i < levels.length) continue;
      await note(`أصمّم وحدات المستوى ${level.code} (${level.unit_count} وحدة)`, {
        progress: 25 + Math.round((60 * i) / outline.value.levels.length),
        step: "units",
      });
      const before = levels.flatMap((l) => l.units.map((u) => `${u.code} ${u.title_en}`));
      const units = await askJson(
        model,
        { system, prompt: levelUnitsPrompt(path, outline.value, i, before, feedback), json: true, temperature: 0.5 },
        zodCheck(levelUnitsSchema),
      );
      levels.push({ code: level.code, title_ar: level.title_ar, goal_ar: level.goal_ar, units: units.value.units });
      await save();
    }
    const plan = pathPlanSchema.safeParse({ summary_ar: outline.value.summary_ar, levels });
    if (!plan.success) throw new Error(`plan invalid: ${planErrors(plan.error).join("; ")}`);
    await note(`جاهز للمراجعة: ${plan.data.levels.length} مستويات و${countUnits(plan.data)} وحدة`, {
      status: "needs_review",
      progress: 100,
      step: "review",
      output: plan.data,
      model: outline.model,
      finished_at: now().toISOString(),
    });
    return job.id;
  } catch (e) {
    if (e instanceof AgentStop) {
      if (e.code === "paused") {
        await note("أوقفتَ الوكيل، فأعدت المهمة إلى الطابور. ستكمل عند تشغيله من جديد.", { status: "queued", progress: 0, step: "waiting" });
      } else if (e.message.startsWith(">") && savedSteps && Number(latestInput.time_resumes ?? 0) < MAX_TIME_RESUMES) {
        // Out of time but steps were saved: continue from them in the next run instead of failing.
        const resumes = Number(latestInput.time_resumes ?? 0) + 1;
        await note("انتهى وقت هذا التشغيل. ما بُني محفوظ، وسأكمل من نفس المحطة في التشغيل القادم.", {
          status: "queued",
          step: "waiting",
          input: { ...latestInput, time_resumes: resumes },
        });
      } else {
        const msg = `تجاوزت المهمة حدها الآمن (${e.message}). أوقفتها حتى لا تستهلك الحصة المجانية. أعد المحاولة، وإن تكرر أخبر المطوّر.`;
        await note(`توقف: ${msg}`, { status: "failed", error: msg, finished_at: now().toISOString() });
        await markFailed();
      }
      return job.id;
    }
    // YouTube problems affect every unit, so the job waits instead of failing.
    if (e instanceof YouTubeError && e.code !== "network") {
      await note(`${ERROR_AR[`youtube_${e.code}`]} (${e.message})`, { status: "queued", progress: 0, step: "waiting" });
      return job.id;
    }
    const code = e instanceof GeminiError ? e.code : null;
    const detail = e instanceof Error ? e.message : String(e);
    // Keep the provider's reason next to the Arabic summary, so a wrong key or model is easy to spot.
    const message = code ? (code === "busy" || detail === code ? ERROR_AR[code] : `${ERROR_AR[code]} (${detail.slice(0, 300)})`) : detail;
    // Out of free quota: put the job back in the queue for the next run.
    if (code === "quota" || code === "busy") {
      await note(message, { status: "queued", progress: 0, step: "waiting" });
      return job.id;
    }
    await note(`توقف: ${message}`, { status: "failed", error: message, finished_at: now().toISOString() });
    await markFailed();
    return job.id;
  }
}

type Note = (msg: string, patch?: Record<string, unknown>) => Promise<void>;

/** factory_unit: builds one unit of an approved map (src/lib/agent/factory.ts). */
async function factoryUnit(job: AgentJob, store: AgentStore, model: Model, tools: UnitTools | undefined, note: Note) {
  const id = typeof job.input.curriculum_unit_id === "string" ? job.input.curriculum_unit_id : "";
  if (!id || !store.unitContext || !tools) throw new Error("factory tools are not available");
  const [ctx, memory] = await Promise.all([store.unitContext(id), store.memory(job.path_id)]);
  await store.setBuildStatus?.(id, "building", job.id);
  const baseId = typeof job.input.base_job_id === "string" ? job.input.base_job_id : null;
  if (job.kind === "factory_lesson" && !job.input.partial) {
    // Revise ONE lesson of a built unit: keep everything else, rewrite that lesson (and its video if asked).
    const key = String(job.input.lesson_key ?? "");
    const base = (baseId && (await store.jobOutput?.(baseId))) as FactoryOutput | null;
    if (!base?.factory?.lessons?.some((l) => l.key === key)) throw new Error("the unit build to revise was not found");
    const partial: FactoryPartial = {
      videos: Object.fromEntries(base.factory.lessons.map((l) => [l.key, l.video])),
      lessons: Object.fromEntries(base.factory.lessons.filter((l) => l.key !== key).map((l) => [l.key, { title_ar: l.title_ar, sections: l.sections }])),
      roleplay: base.factory.roleplay,
      critique: base.factory.qa.critique,
      rewritten: [],
    };
    const videoId = typeof job.input.video_id === "string" ? job.input.video_id : null;
    if (videoId) {
      const lesson = plannedLessons(ctx).find((l) => l.key === key);
      if (!lesson) throw new Error("lesson not found in the unit template");
      await note("أشاهد الفيديو الذي اخترتموه لهذا الدرس", { progress: 15, step: "videos" });
      partial.videos![key] = await watchChosen(ctx, lesson, videoId, (req, check) => askJson(model, req, check));
    }
    job.input = { ...job.input, partial };
    await store.update(job.id, { input: job.input });
  }
  await note(`أبني الوحدة ${ctx.unit.code} «${ctx.unit.title_en}» من خريطة المستوى`, { progress: 10, step: "context" });
  const output = await buildFactoryUnit(
    job,
    ctx,
    memory,
    systemPrompt(memory),
    (req, check) => askJson(model, req, check),
    { search: tools.search, playlist: tools.playlist, resolveChannel: tools.resolveChannel, validate: tools.validate },
    note,
    (partial) => store.update(job.id, { input: { ...job.input, partial } }),
  );
  await store.setBuildStatus?.(id, "review", job.id);
  await store.queueNext?.(id).catch(() => {});
  if (baseId) await store.update(baseId, { status: "rejected", review_note: "استُبدلت بنسخة معدّلة من المراجعة." });
  const errors = output.factory.qa.issues.filter((i) => i.severity === "error").length;
  await note(`الوحدة ${ctx.unit.code} جاهزة للمراجعة${errors ? ` (${errors} ملاحظة يجب إصلاحها)` : ""}`, {
    status: "needs_review",
    progress: 100,
    step: "review",
    output,
    finished_at: new Date().toISOString(),
  });
}

/** plan_level: the frame first, then the units five at a time; every finished step is saved in the job. */
async function planLevel(job: AgentJob, store: AgentStore, model: Model, tools: UnitTools | undefined, note: Note) {
  const levelId = typeof job.input.level_id === "string" ? job.input.level_id : "";
  if (!levelId || !store.levelContext || !store.saveLevelMap) throw new Error("level tools are not available");
  const [ctx, memory] = await Promise.all([store.levelContext(levelId), store.memory(job.path_id)]);
  const feedback = typeof job.input.feedback === "string" ? job.input.feedback : undefined;
  const system = systemPrompt(memory);
  const level = ctx.level.code;
  const partial = (job.input.partial ?? {}) as { playlist?: PlaylistVideo[]; frame?: unknown; units?: MapUnit[]; model?: string };
  const save = (p: typeof partial) => store.update(job.id, { input: { ...job.input, partial: p } });

  let playlist = Array.isArray(partial.playlist) ? partial.playlist : null;
  if (!playlist) {
    const id = ctx.profile?.source_playlist;
    if (id && tools?.playlist) {
      await note("أقرأ قائمة فيديوهات المستوى بالترتيب", { progress: 10, step: "playlist" });
      playlist = await tools.playlist(id);
    } else playlist = [];
    await save({ ...partial, playlist });
  }
  const total = unitCount(ctx, playlist);

  const savedFrame = frameSchema.safeParse(partial.frame);
  let frame: LevelFrame;
  let modelName = partial.model ?? "";
  if (savedFrame.success) frame = savedFrame.data;
  else {
    await note(`أصمّم أهداف المستوى ${level} وتسلسل قواعده (${total} وحدة)`, { progress: 15, step: "frame" });
    const res = await askJson(model, { system, prompt: framePrompt(ctx, total, playlist, feedback), json: true, temperature: 0.4 }, zodCheck(frameSchema));
    frame = res.value;
    modelName = res.model;
    await save({ playlist, frame, units: [], model: modelName });
  }

  const units: MapUnit[] = Array.isArray(partial.units) && savedFrame.success ? [...partial.units] : [];
  if (units.length) await note(`أكمل من حيث توقفت: ${units.length} من ${total} وحدات جاهزة`, { progress: 20, step: "units" });
  while (units.length < total) {
    const from = units.length + 1;
    const size = Math.min(BATCH, total - units.length);
    await note(`أخطط الوحدات ${from}–${from + size - 1} من ${total}`, { progress: 20 + Math.round((70 * units.length) / total), step: "units" });
    const req = { system, prompt: batchPrompt(ctx, frame, units, from, size, total, playlist, feedback), json: true, temperature: 0.5 };
    const parse = (v: unknown) => {
      const r = batchSchema.safeParse(v);
      if (!r.success) return { ok: false as const, errors: r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) };
      if (r.data.units.length !== size) return { ok: false as const, errors: [`expected exactly ${size} units`] };
      return { ok: true as const, value: placeBatch(level, r.data.units, from, playlist) };
    };
    let batch: MapUnit[];
    try {
      // Strict: the batch must also pass the map checks (no repeated word, review words already taught…).
      batch = (
        await askJson(model, req, (v) => {
          const r = parse(v);
          if (!r.ok) return r;
          const errors = batchErrors(level, frame, units, r.value, ctx);
          return errors.length ? { ok: false as const, errors } : r;
        })
      ).value;
    } catch (e) {
      if (e instanceof GeminiError || e instanceof AgentStop) throw e;
      // Still imperfect after a retry: keep it; the checks show the problems to the teacher.
      batch = (await askJson(model, req, parse)).value;
    }
    units.push(...batch);
    await save({ playlist, frame, units, model: modelName });
  }

  const map: LevelMap = partialMap(level, frame, units);
  const issues = checkLevelMap(map, ctx.unitTemplate, ctx.earlierWords);
  await store.saveLevelMap(levelId, map, issues, job.id);
  const errors = issues.filter((i) => i.severity === "error").length;
  await note(
    `خريطة المستوى ${level} جاهزة للمراجعة: ${units.length} وحدة، ${frame.objectives.length} هدفاً، ${units.reduce((n, u) => n + u.words.length, 0)} كلمة${
      errors ? `، و${errors} ملاحظة يجب إصلاحها` : ""
    }`,
    {
      status: "needs_review",
      progress: 100,
      step: "review",
      output: { level, units: units.length, issues: issues.length },
      model: modelName,
      finished_at: new Date().toISOString(),
    },
  );
}

/** Asks for JSON, validates it with `check`, and retries once with the problems. */
async function askJson<T>(
  model: Model,
  req: Parameters<Model>[0],
  check: (v: unknown) => { ok: true; value: T } | { ok: false; errors: string[] },
): Promise<{ value: T; model: string }> {
  let problems: string[] = [];
  for (let attempt = 1; attempt <= 2; attempt++) {
    const res = await model({
      ...req,
      prompt: problems.length ? `${req.prompt}\n\nYour previous answer was invalid: ${problems.join("; ")}. Fix it.` : req.prompt,
    });
    let parsed: unknown;
    try {
      parsed = parseJsonAnswer(res.text);
    } catch {
      problems = ["the answer was not valid JSON"];
      continue;
    }
    const r = check(parsed);
    if (r.ok) return { value: r.value, model: res.model };
    problems = r.errors.slice(0, 10);
  }
  throw new Error(`invalid answer: ${problems.join("; ")}`);
}

function zodCheck<T>(schema: {
  safeParse: (v: unknown) => { success: true; data: T } | { success: false; error: { issues: { path: PropertyKey[]; message: string }[] } };
}) {
  return (v: unknown) => {
    const r = schema.safeParse(v);
    return r.success
      ? ({ ok: true, value: r.data } as const)
      : ({ ok: false, errors: r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) } as const);
  };
}

async function buildUnit(job: AgentJob, store: AgentStore, model: Model, tools: UnitTools, note: Note, now: () => Date) {
  const input = parseBuildInput(job.input);
  if (!input) throw new Error("build_unit input is incomplete");
  const system = systemPrompt(await store.memory(job.path_id));

  await note(`أبحث في يوتيوب عن فيديو لـ «${input.unit.title_ar}»`, { progress: 10, step: "search" });
  const seen = new Map<string, VideoCandidate>();
  for (const q of searchQueries(input.unit, input.level)) {
    for (const v of await tools.search(q)) if (!seen.has(v.id)) seen.set(v.id, v);
    if (seen.size >= 12) break;
  }
  const candidates = [...seen.values()].slice(0, 12);
  if (candidates.length === 0) throw new Error("لم أجد فيديو مناسباً قابلاً للتضمين لهذه الوحدة.");

  await note(`وجدت ${candidates.length} فيديوهات، أختار أنسبها`, { progress: 25, step: "choose" });
  const choice = await askJson(model, { system, prompt: chooseVideoPrompt(input, candidates), json: true, temperature: 0.2 }, (v) => {
    const r = zodCheck(choiceSchema)(v);
    return r.ok && !seen.has(r.value.video_id) ? { ok: false, errors: ["video_id must be one of the listed ids"] } : r;
  });
  const video = seen.get(choice.value.video_id)!;

  await note(`أشاهد «${video.title}» (${video.channel})`, { progress: 40, step: "watch" });
  const timeline = await askJson(
    model,
    { system, prompt: watchPrompt(input), youtubeUrl: `https://www.youtube.com/watch?v=${video.id}`, json: true, temperature: 0.2 },
    zodCheck(timelineSchema),
  );
  if (!timeline.value.suitable) throw new Error(`الفيديو غير مناسب: ${timeline.value.concerns_ar ?? ""}`);

  const clip = await findClip(input, system, model, tools, note).catch(() => null);

  await note(`أكتب الوحدة حول الفيديو: ${timeline.value.segments.length} مقاطع`, { progress: 70, step: "build" });
  const pkg = await askJson(
    model,
    {
      system,
      prompt:
        buildUnitPrompt(input, video, timeline.value, tools.schema, tools.example) +
        (clip ? clipInstructions(clip) : "") +
        (typeof job.input.feedback === "string" ? `\n\nThe owner's note on the previous version of this unit (apply it): ${job.input.feedback}` : ""),
      json: true,
      temperature: 0.5,
    },
    (v) => {
      const r = tools.validate(v);
      return r.ok ? { ok: true, value: v } : { ok: false, errors: r.errors.map((e) => `${e.path}: ${e.message}`) };
    },
  );

  await note("فحصت الوحدة وصارت جاهزة لمراجعتك", {
    status: "needs_review",
    progress: 100,
    step: "review",
    output: { package: pkg.value, video: { ...video, reason_ar: choice.value.reason_ar }, timeline: timeline.value, candidates, clip },
    model: pkg.model,
    finished_at: now().toISOString(),
  });
}

/** An optional authentic scene (film/series clip or real conversation) for the end of the unit. */
async function findClip(
  input: NonNullable<ReturnType<typeof parseBuildInput>>,
  system: string,
  model: Model,
  tools: UnitTools,
  note: Note,
): Promise<ClipChoice | null> {
  await note("أبحث عن مشهد حقيقي (فيلم أو مسلسل أو محادثة) بنفس الموقف", { progress: 55, step: "clip" });
  const seen = new Map<string, VideoCandidate>();
  for (const q of clipQueries(input.unit)) for (const v of await tools.search(q)) seen.set(v.id, v);
  if (seen.size === 0) return null;
  const pick = await askJson(
    model,
    { system, prompt: chooseClipPrompt(input, [...seen.values()].slice(0, 10)), json: true, temperature: 0.2 },
    zodCheck(clipChoiceSchema),
  );
  const id = pick.value.video_id;
  if (!id || !seen.has(id)) {
    await note("لم أجد مشهداً مناسباً لطلابنا، أكمل بدونه");
    return null;
  }
  const v = seen.get(id)!;
  const start = Math.max(0, pick.value.start_sec ?? 0);
  const end = Math.min(v.durationSec, pick.value.end_sec ?? Math.min(v.durationSec, start + 90));
  if (end - start < 20) return null;
  const watched = await askJson(
    model,
    { system, prompt: watchPrompt(input), youtubeUrl: `https://www.youtube.com/watch?v=${id}`, json: true, temperature: 0.2 },
    zodCheck(timelineSchema),
  );
  if (!watched.value.suitable) {
    await note(`استبعدت المشهد: ${watched.value.concerns_ar ?? "غير مناسب"}`);
    return null;
  }
  const segments = watched.value.segments.filter((s) => s.end_sec > start && s.start_sec < end);
  await note(`اخترت مشهد «${v.title}»`);
  return {
    id,
    title: v.title,
    channel: v.channel,
    start_sec: start,
    end_sec: end,
    timeline: { ...watched.value, segments: segments.length >= 2 ? segments : watched.value.segments },
  };
}

async function improveUnit(job: AgentJob, store: AgentStore, model: Model, tools: UnitTools, note: Note, now: () => Date) {
  const unitId = typeof job.input.unit_id === "string" ? job.input.unit_id : null;
  const stats = job.input.stats as UnitStats | undefined;
  if (!unitId || !stats || !store.unitPackage) throw new Error("improve_unit input is incomplete");
  const current = await store.unitPackage(unitId);
  if (!current) throw new Error("لم أجد الوحدة المنشورة.");
  const system = systemPrompt(await store.memory(job.path_id));
  await note(`أدرس نتائج ${stats.attempts} محاولة لأجد ما صعب على الطلاب`, { progress: 20, step: "analyze" });
  const feedback = typeof job.input.feedback === "string" ? `\n\nThe owner's note on the previous proposal (apply it): ${job.input.feedback}` : "";
  const pkg = await askJson(model, { system, prompt: improvePrompt(current.package, stats, tools.schema) + feedback, json: true, temperature: 0.4 }, (v) => {
    if (!v || typeof v !== "object") return { ok: false, errors: ["not an object"] };
    // A new version of the same unit: same code, version + 1.
    const next = { ...(v as Record<string, unknown>), code: current.package.code, version: current.version + 1 };
    const r = tools.validate(next);
    return r.ok ? { ok: true, value: next } : { ok: false, errors: r.errors.map((e) => `${e.path}: ${e.message}`) };
  });
  await note("جهّزت نسخة محسّنة للمراجعة", {
    status: "needs_review",
    progress: 100,
    step: "review",
    output: { package: pkg.value, stats, previous_version: current.version },
    model: pkg.model,
    finished_at: now().toISOString(),
  });
}
