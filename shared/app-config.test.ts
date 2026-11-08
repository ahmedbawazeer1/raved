import { describe, expect, it } from "vitest";
import { compareVersions, DEFAULT_APP_CONFIG, featureOn, parseAppConfig, updateState } from "./app-config";

describe("remote app config", () => {
  it("compares versions numerically", () => {
    expect(compareVersions("1.2.10", "1.10.0")).toBe(-1);
    expect(compareVersions("2.0.0", "1.9.9")).toBe(1);
    expect(compareVersions("1.0.0", "1.0.0")).toBe(0);
  });

  it("asks for an update only when needed", () => {
    const config = parseAppConfig({ min_version: "1.2.0", latest_version: "1.4.0" });
    expect(updateState("1.1.9", config)).toBe("required");
    expect(updateState("1.3.0", config)).toBe("available");
    expect(updateState("1.4.0", config)).toBe("none");
  });

  it("falls back to safe defaults and keeps new features on", () => {
    expect(parseAppConfig({ min_version: "not a version" })).toEqual(DEFAULT_APP_CONFIG);
    expect(parseAppConfig(null)).toEqual(DEFAULT_APP_CONFIG);
    const config = parseAppConfig({ features: { league: false } });
    expect(featureOn(config, "league")).toBe(false);
    expect(featureOn(config, "games")).toBe(true);
  });
});
