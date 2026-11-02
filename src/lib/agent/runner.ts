/**
 * The background runner of «عقل رفد» (unit tested with a fake database and model).
 * Takes the oldest queued job, runs it step by step, records progress and leaves the result
 * for the owner's review. Used by scripts/agent/run.ts (GitHub Actions, service role).
 */
import { systemPrompt } from "./constitution";
import { GeminiError, parseJsonAnswer, type GeminiRequest, type GeminiResult } from "./gemini";
import { countUnits, pathPlanSchema, planErrors, planPathPrompt, type PathContext } from "./plan";
import { buildUnitPrompt, choiceSchema, chooseVideoPrompt, parseBuildInput, searchQueries, timelineSchema, watchPrompt } from "./unit";
import type { VideoCandidate } from "./youtube";

export interface AgentJob {
  id: string;
  kind: "plan_path" | "build_unit" | "improve_unit";
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
}

export type Model = (req: GeminiRequest) => Promise<GeminiResult>;

/** Tools for building units (YouTube search, the package validator and the format reference). */
export interface UnitTools {
  search: (query: string) => Promise<VideoCandidate[]>;
  validate: (pkg: unknown) => { ok: boolean; errors: { path: string; message: string }[] };
  schema: string;
  example: string;
}

export const ERROR_AR: Record<string, string> = {
  not_configured: "مفتاح Gemini غير مضاف بعد (GEMINI_API_KEY).",
  quota: "انتهت حصة Gemini المجانية لليوم. سيعيد الوكيل المحاولة لاحقاً.",
  blocked: "رفض Gemini الطلب لأسباب أمان.",
  bad_response: "رد Gemini بشكل غير متوقع.",
  network: "تعذر الاتصال بـ Gemini.",
};

export async function runNextJob(store: AgentStore, model: Model, tools?: UnitTools, now: () => Date = () => new Date()): Promise<string | null> {
  const job = await store.nextQueued();
  if (!job) return null;
  const log = [...job.log];
  const note = async (msg: string, patch: Record<string, unknown> = {}) => {
    log.push({ at: now().toISOString(), msg });
    await store.update(job.id, { log, ...patch });
  };

  await note("بدأ العمل", { status: "running", started_at: now().toISOString(), progress: 5, step: "start" });
  try {
    if (job.kind === "build_unit") {
      if (!tools) throw new Error("unit tools are not available");
      await buildUnit(job, store, model, tools, note, now);
      return job.id;
    }
    if (job.kind !== "plan_path") throw new Error(`unsupported job kind: ${job.kind}`);
    const [path, memory] = await Promise.all([store.pathContext(job.path_id), store.memory(job.path_id)]);
    await note(`أقرأ المسار «${path.title}» و${memory.length} ملاحظة من مراجعاتك`, { progress: 15, step: "context" });

    const feedback = typeof job.input.feedback === "string" ? job.input.feedback : undefined;
    let lastErrors: string[] = [];
    for (let attempt = 1; attempt <= 2; attempt++) {
      await note(attempt === 1 ? "أصمّم المستويات والوحدات" : "أصحّح الأخطاء وأعيد المحاولة", { progress: 30 + attempt * 20, step: "plan" });
      const prompt = planPathPrompt(path, feedback) + (lastErrors.length ? `\n\nYour previous answer was invalid: ${lastErrors.join("; ")}. Fix it.` : "");
      const res = await model({ system: systemPrompt(memory), prompt, json: true, temperature: 0.5 });
      let parsed: unknown;
      try {
        parsed = parseJsonAnswer(res.text);
      } catch {
        lastErrors = ["the answer was not valid JSON"];
        continue;
      }
      const plan = pathPlanSchema.safeParse(parsed);
      if (!plan.success) {
        lastErrors = planErrors(plan.error);
        continue;
      }
      await note(`جاهز للمراجعة: ${plan.data.levels.length} مستويات و${countUnits(plan.data)} وحدة`, {
        status: "needs_review",
        progress: 100,
        step: "review",
        output: plan.data,
        model: res.model,
        finished_at: now().toISOString(),
      });
      return job.id;
    }
    throw new Error(`plan invalid: ${lastErrors.join("; ")}`);
  } catch (e) {
    const code = e instanceof GeminiError ? e.code : null;
    const message = code ? ERROR_AR[code] : e instanceof Error ? e.message : String(e);
    // Out of free quota: put the job back in the queue for the next run.
    if (code === "quota") {
      await note(message, { status: "queued", progress: 0, step: "waiting" });
      return job.id;
    }
    await note(`توقف: ${message}`, { status: "failed", error: message, finished_at: now().toISOString() });
    return job.id;
  }
}

type Note = (msg: string, patch?: Record<string, unknown>) => Promise<void>;

/** Asks for JSON, validates it with `check`, and retries once with the problems. */
async function askJson<T>(model: Model, req: Parameters<Model>[0], check: (v: unknown) => { ok: true; value: T } | { ok: false; errors: string[] }): Promise<{ value: T; model: string }> {
  let problems: string[] = [];
  for (let attempt = 1; attempt <= 2; attempt++) {
    const res = await model({ ...req, prompt: problems.length ? `${req.prompt}\n\nYour previous answer was invalid: ${problems.join("; ")}. Fix it.` : req.prompt });
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

function zodCheck<T>(schema: { safeParse: (v: unknown) => { success: true; data: T } | { success: false; error: { issues: { path: PropertyKey[]; message: string }[] } } }) {
  return (v: unknown) => {
    const r = schema.safeParse(v);
    return r.success ? ({ ok: true, value: r.data } as const) : ({ ok: false, errors: r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) } as const);
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

  await note(`أكتب الوحدة حول الفيديو: ${timeline.value.segments.length} مقاطع`, { progress: 60, step: "build" });
  const pkg = await askJson(
    model,
    {
      system,
      prompt:
        buildUnitPrompt(input, video, timeline.value, tools.schema, tools.example) +
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
    output: { package: pkg.value, video: { ...video, reason_ar: choice.value.reason_ar }, timeline: timeline.value, candidates },
    model: pkg.model,
    finished_at: now().toISOString(),
  });
}
