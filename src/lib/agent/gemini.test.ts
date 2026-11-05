import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const daily = { error: { code: 429, details: [{ violations: [{ quotaId: "GenerateRequestsPerDayPerProjectPerModel-FreeTier" }] }] } };
const gen = ["generateContent"];

describe("callGemini model fallback", () => {
  it("skips a model whose daily quota is used up and one retired for new keys", async () => {
    const called: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("/models?")) {
          return json(200, {
            models: ["gemini-flash-latest", "gemini-3.8-flash", "gemini-2.5-flash", "gemini-flash-lite-latest"].map((n) => ({
              name: `models/${n}`,
              supportedGenerationMethods: gen,
            })),
          });
        }
        const model = /models\/([^:]+):/.exec(url)?.[1] ?? "";
        called.push(model);
        if (model === "gemini-flash-latest" || model === "gemini-3.8-flash") return json(429, daily);
        if (model === "gemini-2.5-flash") return json(404, { error: { code: 404 } });
        return json(200, { candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }] });
      }),
    );
    const { callGemini } = await import("./gemini");
    const r = await callGemini({ system: "s", prompt: "p", json: true }, { apiKey: "k", retryDelayMs: 1 });
    expect(r.model).toBe("gemini-flash-lite-latest");
    expect(called).toEqual(["gemini-flash-latest", "gemini-3.8-flash", "gemini-2.5-flash", "gemini-flash-lite-latest"]);
  });

  it("moves on to the next model when one stays overloaded", async () => {
    const called: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("/models?")) {
          return json(200, { models: ["gemini-flash-latest", "gemini-3.8-flash"].map((n) => ({ name: `models/${n}`, supportedGenerationMethods: gen })) });
        }
        const model = /models\/([^:]+):/.exec(url)?.[1] ?? "";
        called.push(model);
        if (model === "gemini-flash-latest") return json(503, { error: { code: 503 } });
        return json(200, { candidates: [{ content: { parts: [{ text: "{}" }] } }] });
      }),
    );
    const { callGemini } = await import("./gemini");
    const r = await callGemini({ system: "s", prompt: "p" }, { apiKey: "k", retryDelayMs: 1 });
    expect(r.model).toBe("gemini-3.8-flash");
    expect(called.filter((m) => m === "gemini-flash-latest")).toHaveLength(4);
  });

  it("reports a used-up quota when no model is left", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url.includes("/models?") ? json(200, { models: [{ name: "models/gemini-flash-latest", supportedGenerationMethods: gen }] }) : json(429, daily),
      ),
    );
    const { callGemini, GeminiError } = await import("./gemini");
    await expect(callGemini({ system: "s", prompt: "p" }, { apiKey: "k", retryDelayMs: 1 })).rejects.toBeInstanceOf(GeminiError);
  });
});
