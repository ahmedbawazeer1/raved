import { describe, expect, it } from "vitest";
import { chooseModel } from "./models";

describe("chooseModel", () => {
  it("skips models the provider has retired", () => {
    expect(chooseModel("evaluation", ["llama-3.3-70b-versatile", "openai/gpt-oss-120b"])).toBe("llama-3.3-70b-versatile");
    expect(chooseModel("evaluation", ["openai/gpt-oss-120b", "whisper-large-v3"])).toBe("openai/gpt-oss-120b");
  });

  it("uses the env override when the provider offers it", () => {
    expect(chooseModel("assistant", ["my-model", "llama-3.1-8b-instant"], "my-model")).toBe("my-model");
    expect(chooseModel("assistant", ["llama-3.1-8b-instant"], "gone-model")).toBe("llama-3.1-8b-instant");
  });

  it("falls back to the first candidate when the list is unavailable", () => {
    expect(chooseModel("transcription", null)).toBe("whisper-large-v3-turbo");
    expect(chooseModel("assistant", null, "my-model")).toBe("my-model");
  });
});
