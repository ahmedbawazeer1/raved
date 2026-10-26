import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type LimitedFeature = "speaking" | "writing" | "assistant";
export type AiLimits = Record<LimitedFeature, number>;

export const DEFAULT_LIMITS: AiLimits = { speaking: 5, writing: 3, assistant: 15 };
export const DEFAULT_QUOTA = { groq: 1000 };

/** Today's date in Yemen (the day limits reset). */
export function yemenDay(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Aden", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export interface AiSettings {
  limits: AiLimits;
  paused: boolean;
  dailyQuota: Record<string, number>;
  alertPercent: number;
}

export async function getAiSettings(): Promise<AiSettings> {
  const { data } = await createAdminClient()
    .from("settings")
    .select("key, value")
    .in("key", ["ai_limits", "ai_paused", "ai_daily_quota", "quota_alert_percent"]);
  const get = (key: string) => data?.find((r) => r.key === key)?.value;
  const limits = { ...DEFAULT_LIMITS, ...((get("ai_limits") as Partial<AiLimits> | undefined) ?? {}) };
  return {
    limits,
    paused: get("ai_paused") === true,
    dailyQuota: { ...DEFAULT_QUOTA, ...((get("ai_daily_quota") as Record<string, number> | undefined) ?? {}) },
    alertPercent: typeof get("quota_alert_percent") === "number" ? (get("quota_alert_percent") as number) : 70,
  };
}

/** Successful AI uses of each feature today for this student. */
export async function usedToday(studentId: string): Promise<AiLimits> {
  const { data } = await createAdminClient()
    .from("ai_usage")
    .select("feature")
    .eq("student_id", studentId)
    .eq("day", yemenDay())
    .eq("ok", true)
    .in("feature", ["speaking", "writing", "assistant"]);
  const used: AiLimits = { speaking: 0, writing: 0, assistant: 0 };
  for (const row of data ?? []) used[row.feature as LimitedFeature] += 1;
  return used;
}

export interface RemainingToday {
  limits: AiLimits;
  used: AiLimits;
  remaining: AiLimits;
}

export async function remainingToday(studentId: string): Promise<RemainingToday> {
  const [{ limits }, used] = await Promise.all([getAiSettings(), usedToday(studentId)]);
  const remaining = {
    speaking: Math.max(0, limits.speaking - used.speaking),
    writing: Math.max(0, limits.writing - used.writing),
    assistant: Math.max(0, limits.assistant - used.assistant),
  };
  return { limits, used, remaining };
}

export interface QuotaStatus {
  provider: string;
  requests: number;
  quota: number;
  percent: number;
  alert: boolean;
}

/** Today's calls per provider against its free daily quota (admin warning at 70%). */
export async function quotaStatus(): Promise<QuotaStatus[]> {
  const [settings, { data }] = await Promise.all([
    getAiSettings(),
    createAdminClient().from("ai_usage").select("provider").eq("day", yemenDay()),
  ]);
  const counts = new Map<string, number>();
  for (const row of data ?? []) counts.set(row.provider, (counts.get(row.provider) ?? 0) + 1);
  return Object.entries(settings.dailyQuota).map(([provider, quota]) => {
    const requests = counts.get(provider) ?? 0;
    const percent = quota > 0 ? Math.round((requests / quota) * 100) : 0;
    return { provider, requests, quota, percent, alert: percent >= settings.alertPercent };
  });
}
