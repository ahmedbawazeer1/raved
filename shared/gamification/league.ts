/**
 * The water league (owner decision 2026-11-09): six tiers, groups of 20, top 5 up, bottom 5 down
 * (never from the first two), results on Friday. The server computes everything (weekly_league()).
 */
import { z } from "zod";

export interface LeagueTier {
  id: number;
  name: string;
  /** Glossy fill colours, light → deep (2.5D). */
  light: string;
  deep: string;
}

export const LEAGUE_TIERS: LeagueTier[] = [
  { id: 0, name: "ينبوع", light: "#BFF0E0", deep: "#22B38A" },
  { id: 1, name: "جدول", light: "#BFE9FA", deep: "#2E9BD6" },
  { id: 2, name: "نهر", light: "#9FD8F5", deep: "#1C6FA3" },
  { id: 3, name: "بحيرة", light: "#B9E4E0", deep: "#1F7A6E" },
  { id: 4, name: "بحر", light: "#A9C8F0", deep: "#1C4F7A" },
  { id: 5, name: "محيط", light: "#C7B8F2", deep: "#3B2C8A" },
];
export const PROMOTE = 5;
export const DEMOTE = 5;
export const GROUP_SIZE = 20;

export const tierOf = (id: number | null | undefined): LeagueTier => LEAGUE_TIERS[Math.min(5, Math.max(0, id ?? 0))];
/** No demotion from the first two tiers. */
export const canDemote = (tier: number) => tier >= 2;

const row = z.object({
  rank: z.number(),
  xp: z.number(),
  me: z.boolean(),
  name: z.string(),
  avatar: z.unknown().optional(),
});
export const leagueSchema = z.object({
  week_start: z.string().optional(),
  ends_at: z.string().optional(),
  settled: z.boolean().optional().default(false),
  tier: z.number().nullable().optional().default(0),
  rows: z.array(row).default([]),
  me: z.object({ rank: z.number().nullable(), xp: z.number(), joined: z.boolean(), tier: z.number().nullable().optional() }).nullable().default(null),
  result: z
    .object({
      outcome: z.enum(["up", "stay", "down"]),
      rank: z.number().nullable(),
      xp: z.number().nullable(),
      from_tier: z.number(),
      to_tier: z.number(),
    })
    .nullable()
    .optional()
    .default(null),
});
export type League = z.infer<typeof leagueSchema>;
export type LeagueRow = League["rows"][number];

export function parseLeague(data: unknown): League {
  const p = leagueSchema.safeParse(data);
  return p.success ? p.data : leagueSchema.parse({});
}

/** Which zone a rank is in: promotion (top 5), demotion (bottom 5, from the third tier) or safe. */
export function zoneOf(rank: number, size: number, tier: number): "up" | "down" | "safe" {
  if (rank <= PROMOTE && tier < LEAGUE_TIERS.length - 1) return "up";
  if (canDemote(tier) && rank > Math.max(size - DEMOTE, PROMOTE)) return "down";
  return "safe";
}

/** The Arabic announcement for a result (no blame). */
export function resultText(r: NonNullable<League["result"]>): { title: string; body: string } {
  const to = tierOf(r.to_tier).name,
    from = tierOf(r.from_tier).name;
  if (r.outcome === "up") return { title: `صعدت إلى «${to}»!`, body: `كنت من أول ${PROMOTE} في مجموعتك.` };
  if (r.outcome === "down") return { title: `انتقلت إلى «${to}»`, body: `من «${from}». لا بأس، يمكنك الصعود الأسبوع القادم.` };
  return { title: `بقيت في «${from}»`, body: "أسبوع جديد، فرصة جديدة." };
}

/** Days, hours left until the results (Friday 00:00 Aden). */
export function timeLeft(endsAt: string | undefined, now = new Date()): string {
  if (!endsAt) return "";
  const ms = new Date(endsAt).getTime() - now.getTime();
  if (ms <= 0) return "النتائج اليوم";
  const h = Math.floor(ms / 3_600_000);
  const d = Math.floor(h / 24);
  const days = d === 1 ? "يوم" : d === 2 ? "يومان" : `${d} أيام`;
  return d ? `${days} و${h % 24} س` : `${h} س`;
}

export const CIRCLE_NAMES = ["نهر الأمل", "جدول المجتهدين", "ينبوع المعرفة", "بحيرة النجوم", "وادي الهمم", "شلال الأبطال"] as const;

export const circleSchema = z.object({
  name: z.string(),
  code: z.string(),
  owner: z.boolean(),
  members: z.array(z.object({ name: z.string(), avatar: z.unknown().optional(), me: z.boolean(), active: z.boolean() })),
  total: z.number(),
  goal: z.number(),
});
export type Circle = z.infer<typeof circleSchema>;

export const championsSchema = z.object({
  month: z.string(),
  levels: z.record(
    z.string(),
    z.record(z.enum(["drops", "watering", "arena"]), z.object({ name: z.string(), avatar: z.unknown().optional(), value: z.number() })),
  ),
});
export type Champions = z.infer<typeof championsSchema>;
export const CHAMPION_TITLES: Record<"drops" | "watering" | "arena", { title: string; unit: string }> = {
  drops: { title: "أكثر قطرات", unit: "قطرة" },
  watering: { title: "أطول سقاية", unit: "يوماً" },
  arena: { title: "بطل الساحة", unit: "فوز" },
};
