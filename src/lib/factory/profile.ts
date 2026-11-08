/**
 * The path profile («ملف المسار»): everything that makes one path different from another, as data
 * (table path_profiles, edited in the content studio). The factory reads it; nothing about a path is
 * written in code. Unit tested.
 */
import { z } from "zod";
import { TEMPLATE_KEY } from "./templates";

export const PLAYLIST_ID = /^PL[A-Za-z0-9_-]{10,40}$/;
export const FRAMEWORKS = ["cefr", "exam", "custom"] as const;
export const FRAMEWORK_LABELS: Record<(typeof FRAMEWORKS)[number], string> = {
  cefr: "CEFR",
  exam: "مهارات اختبار",
  custom: "مستويات خاصة بالمسار",
};
export const LANGUAGES = ["ar", "en"] as const;
export const LANGUAGE_LABELS: Record<(typeof LANGUAGES)[number], string> = { ar: "عربي", en: "إنجليزي" };

export const levelProfileSchema = z.object({
  code: z.string().min(1).max(10),
  framework: z.enum(FRAMEWORKS),
  video_language: z.enum(LANGUAGES),
  unit_template: z.string().regex(TEMPLATE_KEY),
  /** A YouTube playlist that sets the order of the level (one unit per video), e.g. A1 = ZAmericanEnglish. */
  source_playlist: z.string().regex(PLAYLIST_ID).optional(),
  notes_ar: z.string().max(600).optional(),
});

export const pathProfileSchema = z.object({
  levels: z.array(levelProfileSchema).max(20),
  video: z
    .object({
      min_sec: z.number().int().min(30).max(1800),
      max_sec: z.number().int().min(60).max(3600),
      captions_required: z.boolean(),
      candidates: z.number().int().min(1).max(5),
    })
    .refine((v) => v.min_sec < v.max_sec, "أقل مدة يجب أن تكون أقصر من أطول مدة"),
  quality: z.object({
    criteria: z.array(z.string().min(3).max(80)).min(1).max(10),
    min_score: z.number().int().min(1).max(5),
  }),
});

export type PathProfile = z.infer<typeof pathProfileSchema>;
export type LevelProfile = z.infer<typeof levelProfileSchema>;

export const DEFAULT_PROFILE: PathProfile = {
  levels: [],
  video: { min_sec: 60, max_sec: 480, captions_required: true, candidates: 3 },
  quality: {
    criteria: ["يطابق أهداف الوحدة", "اللغة ضمن المستوى", "وضوح الشرح العربي", "البيئة اليمنية والقيم", "جودة الخيارات الخاطئة", "الفيديو يخدم الدرس"],
    min_score: 4,
  },
};

/** Reads a stored profile; anything invalid falls back to the defaults (never crash the studio). */
export function parseProfile(raw: unknown): PathProfile {
  const r = pathProfileSchema.safeParse(raw);
  return r.success ? r.data : DEFAULT_PROFILE;
}

export function levelProfile(profile: PathProfile, code: string): LevelProfile | undefined {
  return profile.levels.find((l) => l.code === code);
}

/** Pulls a playlist id out of a pasted YouTube link (or returns it as is). */
export function playlistFromUrl(input: string): string | null {
  const s = input.trim();
  if (PLAYLIST_ID.test(s)) return s;
  try {
    const id = new URL(s).searchParams.get("list");
    return id && PLAYLIST_ID.test(id) ? id : null;
  } catch {
    return null;
  }
}

/** Pulls a channel reference out of a pasted link: a channel id (UC…) or a handle (@name). */
export function channelFromUrl(input: string): string | null {
  const s = input.trim();
  if (/^UC[A-Za-z0-9_-]{22}$/.test(s) || /^@[A-Za-z0-9._-]{3,60}$/.test(s)) return s;
  try {
    const url = new URL(s);
    if (!/(^|\.)youtube\.com$/.test(url.hostname)) return null;
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0]?.startsWith("@")) return /^@[A-Za-z0-9._-]{3,60}$/.test(parts[0]) ? parts[0] : null;
    if (parts[0] === "channel" && parts[1] && /^UC[A-Za-z0-9_-]{22}$/.test(parts[1])) return parts[1];
    return null;
  } catch {
    return null;
  }
}
