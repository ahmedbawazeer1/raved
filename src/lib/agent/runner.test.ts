import { describe, expect, it } from "vitest";
import { CONSTITUTION, systemPrompt } from "./constitution";
import { flashModels, GeminiError, parseJsonAnswer, pickFlashModel, readQuota } from "./gemini";
import { pathPlanSchema, planPathPrompt } from "./plan";
import { runNextJob, type AgentJob, type AgentStore } from "./runner";

const unit = (code: string) => ({
  code,
  title_en: "Hello!",
  title_ar: "التحية",
  stop_ar: "المكلا",
  situation_ar: "حمزة يتعرف على زميل جديد في مدرسة بالمكلا",
  objectives_ar: ["أحيّي وأعرّف بنفسي", "أسأل عن الاسم"],
  grammar: "be: am / is / are",
  vocab_domain: "greetings",
  search_hints: ["greetings for beginners"],
});
const plan = {
  summary_ar: "مسار من الصفر إلى B2 مبني على رحلة حضرموت",
  levels: [{ code: "A1", title_ar: "المبتدئ", goal_ar: "يتواصل في مواقف بسيطة", units: [unit("A1-01"), unit("A1-02"), unit("A1-03")] }],
};

function fakeStore(job: AgentJob | null) {
  const updates: Record<string, unknown>[] = [];
  const store: AgentStore = {
    nextQueued: async () => job,
    update: async (_id, patch) => {
      updates.push(patch);
    },
    pathContext: async () => ({ title: "الإنجليزية", description: null, levels: [{ code: "A1", title: "المبتدئ", kind: "general" }], features: ["vocab"] }),
    memory: async () => ["استخدم أمثلة من سوق المكلا"],
  };
  return { store, updates, last: () => Object.assign({}, ...updates) as Record<string, unknown> };
}
const job: AgentJob = { id: "j1", kind: "plan_path", path_id: "p1", input: {}, log: [] };

describe("agent prompts", () => {
  it("adds the owner's notes after the constitution", () => {
    expect(systemPrompt([])).toBe(CONSTITUTION);
    expect(systemPrompt(["لا أسماء أجنبية"])).toContain("1. لا أسماء أجنبية");
  });

  it("asks for the plan with the existing levels and the owner's feedback", () => {
    const p = planPathPrompt(
      { title: "الإنجليزية", description: null, levels: [{ code: "A1", title: "المبتدئ", kind: "general" }], features: [] },
      "وحدات أقل",
    );
    expect(p).toContain("A1 (المبتدئ, general)");
    expect(p).toContain("وحدات أقل");
  });

  it("picks the newest flash model that can generate content", () => {
    const gen = ["generateContent"];
    expect(
      pickFlashModel([
        { name: "models/gemini-2.5-flash", supportedGenerationMethods: gen },
        { name: "models/gemini-3.0-flash", supportedGenerationMethods: gen },
        { name: "models/gemini-3.0-flash-lite", supportedGenerationMethods: gen },
        { name: "models/gemini-3.0-flash-image", supportedGenerationMethods: gen },
        { name: "models/text-embedding-004", supportedGenerationMethods: ["embedContent"] },
      ]),
    ).toBe("gemini-3.0-flash");
    expect(pickFlashModel([{ name: "models/gemini-flash-latest", supportedGenerationMethods: gen }])).toBe("gemini-flash-latest");
    expect(pickFlashModel([])).toBeNull();
  });

  it("falls back from flash to lite models, newest first", () => {
    const gen = ["generateContent"];
    const m = (name: string) => ({ name: `models/${name}`, supportedGenerationMethods: gen });
    expect(
      flashModels([m("gemini-2.5-flash-lite"), m("gemini-2.5-flash"), m("gemini-flash-latest"), m("gemini-3.0-flash"), m("gemini-flash-lite-latest")]),
    ).toEqual(["gemini-flash-latest", "gemini-3.0-flash", "gemini-2.5-flash", "gemini-flash-lite-latest", "gemini-2.5-flash-lite"]);
  });

  it("tells a per-minute limit from a used-up daily quota", () => {
    const body = (quotaId: string) =>
      JSON.stringify({
        error: {
          code: 429,
          details: [
            { "@type": "type.googleapis.com/google.rpc.QuotaFailure", violations: [{ quotaId }] },
            { "@type": "type.googleapis.com/google.rpc.RetryInfo", retryDelay: "34s" },
          ],
        },
      });
    expect(readQuota(body("GenerateRequestsPerMinutePerProjectPerModel-FreeTier"))).toMatchObject({ perMinute: true, retrySec: 34 });
    expect(readQuota(body("GenerateRequestsPerDayPerProjectPerModel-FreeTier")).perMinute).toBe(false);
  });

  it("reads JSON wrapped in code fences", () => {
    expect(parseJsonAnswer('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it("validates plans and rejects duplicate unit codes", () => {
    expect(pathPlanSchema.safeParse(plan).success).toBe(true);
    const dup = { ...plan, levels: [{ ...plan.levels[0], units: [unit("A1-01"), unit("A1-01"), unit("A1-02")] }] };
    expect(pathPlanSchema.safeParse(dup).success).toBe(false);
  });
});

describe("runNextJob", () => {
  it("does nothing when the queue is empty", async () => {
    const { store } = fakeStore(null);
    expect(await runNextJob(store, async () => ({ text: "{}", model: "m", sources: [] }))).toBeNull();
  });

  it("plans a path and leaves it for review", async () => {
    const { store, last } = fakeStore({ ...job });
    let system = "";
    const prompts: string[] = [];
    await runNextJob(store, async (req) => {
      system = req.system;
      prompts.push(req.prompt);
      const { units, ...level } = plan.levels[0];
      const answer = req.prompt.startsWith("Design the levels") ? { summary_ar: plan.summary_ar, levels: [{ ...level, unit_count: units.length }] } : { units };
      return { text: JSON.stringify(answer), model: "gemini-test", sources: [] };
    });
    expect(prompts).toHaveLength(2);
    expect(system).toContain("سوق المكلا");
    expect(last()).toMatchObject({ status: "needs_review", progress: 100, model: "gemini-test", output: plan });
  });

  it("retries once with the validation errors, then fails clearly", async () => {
    const { store, last } = fakeStore({ ...job });
    let calls = 0;
    await runNextJob(store, async () => {
      calls++;
      return { text: '{"summary_ar":"x","levels":[]}', model: "m", sources: [] };
    });
    expect(calls).toBe(2);
    expect(last()).toMatchObject({ status: "failed" });
  });

  it("puts the job back in the queue when the free quota is used up", async () => {
    const { store, last } = fakeStore({ ...job });
    await runNextJob(store, async () => {
      throw new GeminiError("quota");
    });
    expect(last()).toMatchObject({ status: "queued", step: "waiting" });
  });

  it("puts the job back in the queue when Gemini is overloaded", async () => {
    const { store, last } = fakeStore({ ...job });
    await runNextJob(store, async () => {
      throw new GeminiError("busy");
    });
    expect(last()).toMatchObject({ status: "queued", step: "waiting" });
  });

  it("explains a missing key in Arabic", async () => {
    const { store, last } = fakeStore({ ...job });
    await runNextJob(store, async () => {
      throw new GeminiError("not_configured");
    });
    expect(String(last().error)).toContain("GEMINI_API_KEY");
  });
});
