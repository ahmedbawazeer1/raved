/**
 * Static path catalog for the public pages until the `paths` table exists (phase 1).
 * Shape mirrors the planned table (docs/PRD.md section 11).
 */
export type PathStatus = "draft" | "soon" | "published";

export type PathIcon = "book" | "code" | "database" | "pen";

export interface CatalogPath {
  slug: string;
  title: string;
  summary: string;
  status: PathStatus;
  icon: PathIcon;
  order: number;
  /** Shown on the featured card only. */
  levels?: string[];
  duration?: string;
}

export const catalogPaths: CatalogPath[] = [
  {
    slug: "english",
    title: "الإنجليزية: من الصفر إلى الشهادة",
    summary: "A1 → B2 ثم IELTS أو TOEFL أو Duolingo",
    status: "published",
    icon: "book",
    order: 1,
    levels: ["A1", "A2", "B1", "B2"],
    duration: "3 سنوات · 25 دقيقة يومياً",
  },
  {
    slug: "web",
    title: "أساسيات تطوير الويب",
    summary: "HTML و CSS و JavaScript ومشاريع حقيقية",
    status: "soon",
    icon: "code",
    order: 2,
  },
  {
    slug: "data",
    title: "تحليل البيانات بلغة Python",
    summary: "من الجداول إلى الرسوم البيانية",
    status: "soon",
    icon: "database",
    order: 3,
  },
  {
    slug: "design",
    title: "أساسيات التصميم الرقمي",
    summary: "الألوان والخطوط وتصميم الواجهات",
    status: "soon",
    icon: "pen",
    order: 4,
  },
];

/** Paths visible in the public catalog (drafts hidden), in admin order. */
export function getPublicPaths(paths: CatalogPath[] = catalogPaths): CatalogPath[] {
  return paths.filter((p) => p.status !== "draft").sort((a, b) => a.order - b.order);
}
