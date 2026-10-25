import { afterEach, describe, expect, it, vi } from "vitest";
import { getSupabasePublicEnv, isSupabaseConfigured } from "./env";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getSupabasePublicEnv", () => {
  it("returns the values when configured", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abc.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    expect(isSupabaseConfigured()).toBe(true);
    expect(getSupabasePublicEnv()).toEqual({
      url: "https://abc.supabase.co",
      publishableKey: "sb_publishable_test",
    });
  });

  it("throws a clear error when missing", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    expect(isSupabaseConfigured()).toBe(false);
    expect(() => getSupabasePublicEnv()).toThrow(/Supabase is not configured/);
  });
});
