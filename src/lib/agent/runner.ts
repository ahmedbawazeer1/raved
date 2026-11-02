/**
 * The background runner of «عقل رفد» (unit tested with a fake database and model).
 * Takes the oldest queued job, runs it step by step, records progress and leaves the result
 * for the owner's review. Used by scripts/agent/run.ts (GitHub Actions, service role).
 */
import { systemPrompt } from "./constitution";
import { GeminiError, parseJsonAnswer, type GeminiRequest, type GeminiResult } from "./gemini";
import { countUnits, pathPlanSchema, planErrors, planPathPrompt, type PathContext } from "./plan";

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

export const ERROR_AR: Record<string, string> = {
  not_configured: "مفتاح Gemini غير مضاف بعد (GEMINI_API_KEY).",
  quota: "انتهت حصة Gemini المجانية لليوم. سيعيد الوكيل المحاولة لاحقاً.",
  blocked: "رفض Gemini الطلب لأسباب أمان.",
  bad_response: "رد Gemini بشكل غير متوقع.",
  network: "تعذر الاتصال بـ Gemini.",
};

export async function runNextJob(store: AgentStore, model: Model, now: () => Date = () => new Date()): Promise<string | null> {
  const job = await store.nextQueued();
  if (!job) return null;
  const log = [...job.log];
  const note = async (msg: string, patch: Record<string, unknown> = {}) => {
    log.push({ at: now().toISOString(), msg });
    await store.update(job.id, { log, ...patch });
  };

  await note("بدأ العمل", { status: "running", started_at: now().toISOString(), progress: 5, step: "start" });
  try {
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
