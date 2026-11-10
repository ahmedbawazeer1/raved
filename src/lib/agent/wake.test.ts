import { afterEach, describe, expect, it, vi } from "vitest";
import { wakeAgent } from "./wake";

describe("wakeAgent", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("does nothing without a token", async () => {
    vi.stubEnv("AGENT_WAKE_TOKEN", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await wakeAgent()).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("starts the agent workflow on main", async () => {
    vi.stubEnv("AGENT_WAKE_TOKEN", "t");
    const fetchMock = vi.fn().mockResolvedValue({ status: 204 });
    vi.stubGlobal("fetch", fetchMock);
    expect(await wakeAgent()).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/actions/workflows/agent.yml/dispatches");
    expect(JSON.parse(init.body)).toEqual({ ref: "main" });
  });

  it("never throws when GitHub is unreachable", async () => {
    vi.stubEnv("AGENT_WAKE_TOKEN", "t");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    expect(await wakeAgent()).toBe(false);
  });
});
