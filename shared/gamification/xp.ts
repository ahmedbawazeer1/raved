/** Points (XP), player levels and badges (pure logic, unit tested). */

/** Points needed to reach each player level: 0, 50, 150, 300, 500, 750… (+50 more each level). */
export function xpForLevel(level: number): number {
  return 25 * (level - 1) * level;
}

export interface PlayerLevel {
  level: number;
  /** Points earned inside the current level. */
  into: number;
  /** Points the current level spans (to the next level). */
  span: number;
}

export function playerLevel(xp: number): PlayerLevel {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  const base = xpForLevel(level);
  return { level, into: xp - base, span: xpForLevel(level + 1) - base };
}

export interface BadgeStats {
  xp: number;
  lessons: number;
  unitsPassed: number;
  perfectQuizzes: number;
  videos: number;
  speaking: number;
  writing: number;
  wordReviews: number;
  streak: number;
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  icon: string;
  earned: boolean;
  /** 0–1 progress toward the badge. */
  progress: number;
}

interface BadgeRule {
  id: string;
  title: string;
  description: string;
  icon: string;
  stat: keyof BadgeStats;
  goal: number;
}

/** Badge names come from Hadramout, like the journey. */
const RULES: BadgeRule[] = [
  { id: "first-step", title: "أول خطوة", description: "أكملت أول درس", icon: "👣", stat: "lessons", goal: 1 },
  { id: "mukalla-ambassador", title: "سفير المكلا", description: "نجحت في أول وحدة", icon: "⚓", stat: "unitsPassed", goal: 1 },
  { id: "shibam-builder", title: "باني شبام", description: "نجحت في 5 وحدات", icon: "🏰", stat: "unitsPassed", goal: 5 },
  { id: "doan-bee", title: "نحلة دوعن", description: "7 أيام متتالية من الدراسة", icon: "🐝", stat: "streak", goal: 7 },
  { id: "desert-camel", title: "جمل الصحراء", description: "30 يوماً متتالية من الدراسة", icon: "🐪", stat: "streak", goal: 30 },
  { id: "word-fisher", title: "صياد الكلمات", description: "راجعت 50 كلمة", icon: "🎣", stat: "wordReviews", goal: 50 },
  { id: "loyal-viewer", title: "المشاهد المخلص", description: "شاهدت 10 فيديوهات كاملة", icon: "🎬", stat: "videos", goal: 10 },
  { id: "eloquent", title: "اللسان الفصيح", description: "أنجزت 5 مهام محادثة", icon: "🎤", stat: "speaking", goal: 5 },
  { id: "hadrami-pen", title: "القلم الحضرمي", description: "أنجزت 5 مهام كتابة", icon: "✍️", stat: "writing", goal: 5 },
  { id: "full-mark", title: "العلامة الكاملة", description: "حصلت على 100% في اختبار وحدة", icon: "💯", stat: "perfectQuizzes", goal: 1 },
  { id: "seiyun-star", title: "نجم سيئون", description: "جمعت 1000 نقطة", icon: "⭐", stat: "xp", goal: 1000 },
];

export function badges(stats: BadgeStats): Badge[] {
  return RULES.map((r) => {
    const value = stats[r.stat];
    return {
      id: r.id,
      title: r.title,
      description: r.description,
      icon: r.icon,
      earned: value >= r.goal,
      progress: Math.min(1, value / r.goal),
    };
  });
}

export type XpKind = "lesson" | "video" | "quiz" | "quiz_perfect" | "speaking" | "writing" | "vocab" | "certificate";

/** Turns the student's point rows into badge stats (streak comes from the activity dates). */
export function statsFromXp(rows: { kind: string; points: number }[], streak: number): BadgeStats {
  const count = (kind: XpKind) => rows.filter((r) => r.kind === kind).length;
  return {
    xp: rows.reduce((sum, r) => sum + r.points, 0),
    lessons: count("lesson"),
    unitsPassed: count("quiz"),
    perfectQuizzes: count("quiz_perfect"),
    videos: count("video"),
    speaking: count("speaking"),
    writing: count("writing"),
    wordReviews: count("vocab"),
    streak,
  };
}
