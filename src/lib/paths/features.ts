/** Feature flags a path can enable (paths.features). UI hides disabled features. */
export const PATH_FEATURES = [
  { key: "placement", label: "اختبار مستوى" },
  { key: "vocab", label: "مفردات" },
  { key: "speaking", label: "محادثة" },
  { key: "writing", label: "كتابة" },
  { key: "exam_track", label: "مسار امتحان" },
  { key: "projects", label: "مشاريع" },
] as const;

export type PathFeature = (typeof PATH_FEATURES)[number]["key"];
export type PathFeatures = Record<PathFeature, boolean>;

export function parseFeatures(value: unknown): PathFeatures {
  const obj = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return Object.fromEntries(PATH_FEATURES.map(({ key }) => [key, obj[key] === true])) as PathFeatures;
}

export const PATH_STATUSES = [
  { value: "draft", label: "مسودة (مخفي)", short: "مسودة" },
  { value: "soon", label: "قريباً (يظهر مع «أبلغني»)", short: "قريباً" },
  { value: "published", label: "منشور", short: "منشور" },
] as const;

export type PathStatus = (typeof PATH_STATUSES)[number]["value"];

export function pathStatusLabel(status: string): string {
  return PATH_STATUSES.find((s) => s.value === status)?.short ?? status;
}

/** "36" months → "3 سنوات"; used on path cards. */
export function durationLabel(months: number | null | undefined, dailyMinutes: number): string | null {
  if (!months) return null;
  const years = months / 12;
  const span =
    Number.isInteger(years) && years >= 1
      ? years === 1
        ? "سنة"
        : years === 2
          ? "سنتان"
          : `${years} ${years <= 10 ? "سنوات" : "سنة"}`
      : `${months} ${months <= 10 ? "أشهر" : "شهراً"}`;
  return `${span} · ${dailyMinutes} دقيقة يومياً`;
}
