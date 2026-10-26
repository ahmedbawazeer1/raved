import "server-only";
import { cache } from "react";
import { createPublicClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { catalogPaths, type PathIcon } from "./catalog";
import { durationLabel, parseFeatures, type PathFeatures } from "./features";

export interface PublicLevel {
  id: string;
  code: string;
  title: string;
  description: string;
  kind: string;
  planned_units: number | null;
}

export interface PublicPath {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  status: "soon" | "published";
  icon: PathIcon;
  features: PathFeatures;
  duration: string | null;
  levels: PublicLevel[];
}

const ICONS: PathIcon[] = ["book", "code", "database", "pen"];

function toIcon(value: string): PathIcon {
  return (ICONS as string[]).includes(value) ? (value as PathIcon) : "book";
}

/** Static fallback used before Supabase is configured (e.g. CI builds). */
function fallbackPaths(): PublicPath[] {
  return catalogPaths
    .filter((p) => p.status !== "draft")
    .map((p) => ({
      id: p.slug,
      slug: p.slug,
      title: p.title,
      summary: p.summary,
      description: p.summary,
      status: p.status as "soon" | "published",
      icon: p.icon,
      features: parseFeatures({}),
      duration: p.duration ?? null,
      levels: (p.levels ?? []).map((code) => ({ id: code, code, title: code, description: "", kind: "general", planned_units: null })),
    }));
}

/** Non-draft paths with their levels, published first then by admin order. */
export const getPublicPaths = cache(async (): Promise<PublicPath[]> => {
  if (!isSupabaseConfigured()) return fallbackPaths();
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("paths")
    .select("id, slug, title, summary, description, status, icon, features, est_months, daily_minutes, position, levels(id, code, title, description, kind, planned_units, position)")
    .neq("status", "draft")
    .order("position");
  if (error || !data) return fallbackPaths();

  return data
    .map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      summary: p.summary,
      description: p.description,
      status: p.status as "soon" | "published",
      icon: toIcon(p.icon),
      features: parseFeatures(p.features),
      duration: durationLabel(p.est_months, p.daily_minutes),
      levels: [...(p.levels ?? [])]
        .sort((a, b) => a.position - b.position)
        .map((l) => ({
          id: l.id,
          code: l.code,
          title: l.title,
          description: l.description,
          kind: l.kind,
          planned_units: l.planned_units,
        })),
    }))
    .sort((a, b) => Number(b.status === "published") - Number(a.status === "published"));
});

export async function getPublicPath(slug: string): Promise<PublicPath | null> {
  const paths = await getPublicPaths();
  return paths.find((p) => p.slug === slug) ?? null;
}

export interface PublicUnit {
  code: string;
  title: string;
  position: number;
  package_size_bytes: number | null;
}

/** Published units of a level (for the public path page). */
export async function getPublishedUnits(levelId: string): Promise<PublicUnit[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("units")
    .select("code, title, position, package_size_bytes")
    .eq("level_id", levelId)
    .eq("status", "published")
    .order("position");
  return data ?? [];
}

export interface PublicExam {
  code: string;
  name: string;
  summary: string;
  locations: string;
}

export async function getExams(): Promise<PublicExam[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createPublicClient();
  const { data } = await supabase.from("exams").select("code, name, summary, locations").order("position");
  return data ?? [];
}
