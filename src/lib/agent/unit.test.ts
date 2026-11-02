import { describe, expect, it } from "vitest";
import { runNextJob, type AgentJob, type AgentStore, type UnitTools } from "./runner";
import { parseBuildInput, searchQueries } from "./unit";
import { isoDurationSeconds } from "./youtube";

const unit = {
  code: "A1-04",
  title_en: "At the market",
  title_ar: "في السوق",
  stop_ar: "الديس",
  situation_ar: "حمزة يشتري التمر والعسل من سوق الديس",
  objectives_ar: ["أطلب شيئاً", "أسأل عن الكمية"],
  grammar: "I want / How many",
  vocab_domain: "food and shopping",
  search_hints: ["shopping at the market", "how much is it English"],
};
const input = { path_slug: "english", level: "A1", position: 4, unit, previous: ["Hello!"] };
const timeline = {
  summary_en: "A short dialogue at a market about buying dates.",
  duration_sec: 300,
  segments: [
    { start_sec: 0, end_sec: 120, what_happens_en: "Greeting the seller", key_sentences: ["Good morning!"] },
    { start_sec: 120, end_sec: 300, what_happens_en: "Buying dates", key_sentences: ["I want dates, please."] },
  ],
  words: ["dates", "honey"],
  suitable: true,
};

function harness(answers: (prompt: string) => string, validateOk = true) {
  const updates: Record<string, unknown>[] = [];
  const job: AgentJob = { id: "j", kind: "build_unit", path_id: "p", input, log: [] };
  const store: AgentStore = {
    nextQueued: async () => job,
    update: async (_id, patch) => void updates.push(patch),
    pathContext: async () => ({ title: "", description: null, levels: [], features: [] }),
    memory: async () => [],
  };
  const tools: UnitTools = {
    search: async () => [{ id: "abcdefghijk", title: "Shopping English", channel: "Good Channel", description: "", durationSec: 300, captions: true, views: 1000 }],
    validate: () => (validateOk ? { ok: true, errors: [] } : { ok: false, errors: [{ path: "/lessons", message: "missing" }] }),
    schema: "{}",
    example: "{}",
  };
  const prompts: { prompt: string; youtubeUrl?: string }[] = [];
  const model = async (req: { prompt: string; youtubeUrl?: string }) => {
    prompts.push(req);
    return { text: answers(req.prompt), model: "gemini-test", sources: [] };
  };
  return { run: () => runNextJob(store, model, tools), last: () => Object.assign({}, ...updates) as Record<string, unknown>, prompts };
}

function answer(prompt: string): string {
  if (prompt.startsWith("Choose")) return JSON.stringify({ video_id: "abcdefghijk", reason_ar: "واضح ومناسب" });
  if (prompt.startsWith("Watch")) return JSON.stringify(timeline);
  return JSON.stringify({ code: "A1-04", lessons: [] });
}

describe("unit builder", () => {
  it("parses durations", () => {
    expect(isoDurationSeconds("PT4M13S")).toBe(253);
    expect(isoDurationSeconds("PT1H")).toBe(3600);
    expect(isoDurationSeconds("bad")).toBe(0);
  });

  it("reads the job input and makes search queries", () => {
    expect(parseBuildInput(input)?.unit.code).toBe("A1-04");
    expect(parseBuildInput({})).toBeNull();
    expect(searchQueries(unit, "A1")[0]).toContain("English lesson A1");
  });

  it("searches, chooses, watches and writes the unit for review", async () => {
    const h = harness(answer);
    await h.run();
    expect(h.prompts.some((p) => p.youtubeUrl === "https://www.youtube.com/watch?v=abcdefghijk")).toBe(true);
    const out = h.last();
    expect(out.status).toBe("needs_review");
    expect((out.output as { video: { id: string } }).video.id).toBe("abcdefghijk");
  });

  it("refuses a video the model picked that was not in the search results", async () => {
    const h = harness((p) => (p.startsWith("Choose") ? JSON.stringify({ video_id: "zzzzzzzzzzz", reason_ar: "x" }) : answer(p)));
    await h.run();
    expect(h.last().status).toBe("failed");
  });

  it("stops when the video is not suitable", async () => {
    const h = harness((p) => (p.startsWith("Watch") ? JSON.stringify({ ...timeline, suitable: false, concerns_ar: "مشهد غير لائق" }) : answer(p)));
    await h.run();
    expect(String(h.last().error)).toContain("غير مناسب");
  });

  it("fails clearly when the package stays invalid after a retry", async () => {
    const h = harness(answer, false);
    await h.run();
    expect(h.last().status).toBe("failed");
    expect(h.prompts.filter((p) => p.prompt.includes("Write the complete unit package")).length).toBe(2);
  });
});
