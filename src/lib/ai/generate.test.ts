import { APICallError } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { AiError } from "./errors";
import { generateJson, generatePlainText, type CallRecord } from "./generate";

const usage = {
  inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 5, text: 5, reasoning: undefined },
};
const reply = (text: string) => ({ content: [{ type: "text" as const, text }], finishReason: { unified: "stop" as const, raw: "stop" }, usage, warnings: [] });
const schema = z.object({ score: z.number().int().min(1).max(5) });

describe("generateJson", () => {
  it("returns validated JSON and logs one successful call", async () => {
    const calls: CallRecord[] = [];
    const model = new MockLanguageModelV4({ doGenerate: reply('{"score":4}') });
    const data = await generateJson({ model, system: "s", prompt: "p", temperature: 0.2, schema, onCall: (c) => void calls.push(c) });
    expect(data).toEqual({ score: 4 });
    expect(calls).toEqual([{ ok: true, error: undefined, inputTokens: 10, outputTokens: 5 }]);
  });

  it("retries once with the JSON reminder after an invalid answer", async () => {
    const model = new MockLanguageModelV4({ doGenerate: [reply('{"score":9}'), reply('{"score":3}')] });
    const calls: CallRecord[] = [];
    const data = await generateJson({ model, system: "s", prompt: "p", temperature: 0.2, schema, onCall: (c) => void calls.push(c) });
    expect(data).toEqual({ score: 3 });
    expect(calls.map((c) => c.ok)).toEqual([false, true]);
    const secondPrompt = JSON.stringify(model.doGenerateCalls[1].prompt);
    expect(secondPrompt).toContain("Return only valid JSON matching the schema.");
  });

  it("gives up with «invalid» after two bad answers (not counted as success)", async () => {
    const model = new MockLanguageModelV4({ doGenerate: [reply("not json"), reply('{"nope":1}')] });
    const calls: CallRecord[] = [];
    await expect(generateJson({ model, system: "s", prompt: "p", temperature: 0.2, schema, onCall: (c) => void calls.push(c) })).rejects.toMatchObject({
      kind: "invalid",
    });
    expect(calls.every((c) => !c.ok)).toBe(true);
  });

  it("turns a 429 into «rate_limited» without retrying", async () => {
    let n = 0;
    const model = new MockLanguageModelV4({
      doGenerate: async () => {
        n++;
        throw new APICallError({ message: "Too many requests", url: "https://api.groq.com", requestBodyValues: {}, statusCode: 429, isRetryable: false });
      },
    });
    const calls: CallRecord[] = [];
    const err = await generateJson({ model, system: "s", prompt: "p", temperature: 0.2, schema, onCall: (c) => void calls.push(c) }).catch((e) => e);
    expect(err).toBeInstanceOf(AiError);
    expect(err.kind).toBe("rate_limited");
    expect(n).toBe(1);
    // The log keeps the provider's reason, so failures can be diagnosed.
    expect(calls[0].error).toBe("rate_limited 429: Too many requests");
  });
});

describe("generateJson with Groq JSON mode", () => {
  it("retries when the provider rejects cut-off JSON (400 json_validate_failed)", async () => {
    let n = 0;
    const model = new MockLanguageModelV4({
      doGenerate: async () => {
        n++;
        if (n === 1)
          throw new APICallError({
            message: "Failed to generate JSON",
            url: "https://api.groq.com",
            requestBodyValues: {},
            statusCode: 400,
            responseBody: '{"error":{"code":"json_validate_failed"}}',
            isRetryable: false,
          });
        return reply('{"score":5}');
      },
    });
    const calls: CallRecord[] = [];
    expect(await generateJson({ model, system: "s", prompt: "p", temperature: 0.2, schema, onCall: (c) => void calls.push(c) })).toEqual({ score: 5 });
    expect(calls.map((c) => c.ok)).toEqual([false, true]);
    expect(model.doGenerateCalls[0].maxOutputTokens).toBe(3000);
  });
});

describe("generatePlainText", () => {
  it("passes the chat history and returns the answer", async () => {
    const model = new MockLanguageModelV4({ doGenerate: reply("  الجواب  ") });
    const text = await generatePlainText({
      model,
      system: "s",
      prompt: "",
      temperature: 0.5,
      messages: [
        { role: "user", content: "سؤال" },
        { role: "assistant", content: "جواب" },
        { role: "user", content: "سؤال ثانٍ" },
      ],
    });
    expect(text).toBe("الجواب");
    expect(model.doGenerateCalls[0].prompt.filter((m) => m.role === "user")).toHaveLength(2);
  });
});
