/**
 * Remote app config (table public.app_config, edited by the admin). Lets us turn features on or off,
 * show a notice and require an app update WITHOUT shipping a new app. Unit tested.
 */
import { z } from "zod";

export const appConfigSchema = z.object({
  /** Versions below this must update from the store before continuing. */
  min_version: z
    .string()
    .regex(/^\d+\.\d+\.\d+$/)
    .default("1.0.0"),
  /** Versions below this see a gentle «تحديث متوفر» notice. */
  latest_version: z
    .string()
    .regex(/^\d+\.\d+\.\d+$/)
    .default("1.0.0"),
  /** Feature switches, e.g. { "games": true, "league": false }. Unknown keys are allowed (newer apps). */
  features: z.record(z.string(), z.boolean()).default({}),
  /** A short Arabic message shown on top of the app (maintenance, news), or null. */
  notice_ar: z.string().max(300).nullable().default(null),
  store_url: z.string().url().nullable().default(null),
});
export type AppConfig = z.infer<typeof appConfigSchema>;

export const DEFAULT_APP_CONFIG: AppConfig = appConfigSchema.parse({});

/** Reads whatever the server sent; anything invalid falls back to safe defaults (the app keeps working). */
export function parseAppConfig(raw: unknown): AppConfig {
  const r = appConfigSchema.safeParse(raw ?? {});
  return r.success ? r.data : DEFAULT_APP_CONFIG;
}

/** -1, 0 or 1, comparing "1.2.10" and "1.10.0" numerically. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d > 0 ? 1 : -1;
  }
  return 0;
}

export type UpdateState = "required" | "available" | "none";

export function updateState(current: string, config: AppConfig): UpdateState {
  if (compareVersions(current, config.min_version) < 0) return "required";
  if (compareVersions(current, config.latest_version) < 0) return "available";
  return "none";
}

/** A feature is on unless the admin switched it off (new features ship on by default). */
export function featureOn(config: AppConfig, key: string): boolean {
  return config.features[key] !== false;
}
