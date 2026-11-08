/** Saving vocabulary reviews: one implementation for the website and the app (RLS: own rows only). */
import type { TablesInsert } from "../db-types";
import type { Db } from "./client";
import { schedule, type Grade } from "../srs";

export interface ReviewInput {
  id: string;
  vocabItemId: string;
  grade: Grade;
  reviewedAt: string;
}

/**
 * Saves reviews (also ones queued offline) and schedules each word with the shared SRS.
 * Returns the queue ids that are safely stored, including repeats it already had.
 */
export async function saveReviews(db: Db, userId: string, reviews: ReviewInput[]): Promise<{ accepted: string[] }> {
  if (!reviews.length) return { accepted: [] };
  const { data: rows, error } = await db
    .from("vocab_reviews")
    .select("vocab_item_id, ease, interval_days, repetitions, lapses, last_reviewed_at, review_count")
    .eq("student_id", userId)
    .in("vocab_item_id", [...new Set(reviews.map((r) => r.vocabItemId))]);
  if (error) return { accepted: [] };

  type State = Pick<TablesInsert<"vocab_reviews">, "ease" | "interval_days" | "repetitions" | "lapses" | "last_reviewed_at" | "review_count">;
  const state = new Map<string, State>(rows.map((r) => [r.vocab_item_id, r]));
  const now = Date.now();
  const accepted: string[] = [];
  const upserts = new Map<string, TablesInsert<"vocab_reviews">>();

  for (const r of [...reviews].sort((a, b) => a.reviewedAt.localeCompare(b.reviewedAt))) {
    // A clock in the future (wrong phone time) counts as now.
    const at = new Date(Math.min(new Date(r.reviewedAt).getTime(), now));
    const prev = state.get(r.vocabItemId);
    accepted.push(r.id);
    if (prev?.last_reviewed_at && new Date(prev.last_reviewed_at) >= at) continue; // already counted
    const next = schedule(
      prev ? { ease: Number(prev.ease), intervalDays: prev.interval_days ?? 0, repetitions: prev.repetitions ?? 0, lapses: prev.lapses ?? 0 } : null,
      r.grade,
      at,
    );
    const row = {
      student_id: userId,
      vocab_item_id: r.vocabItemId,
      ease: next.ease,
      interval_days: next.intervalDays,
      repetitions: next.repetitions,
      lapses: next.lapses,
      due_at: next.dueAt.toISOString(),
      last_result: r.grade,
      last_reviewed_at: at.toISOString(),
      review_count: (prev?.review_count ?? 0) + 1,
    };
    state.set(r.vocabItemId, row);
    upserts.set(r.vocabItemId, row);
  }

  if (upserts.size) {
    const { error: saveError } = await db.from("vocab_reviews").upsert([...upserts.values()], { onConflict: "student_id,vocab_item_id" });
    if (saveError) return { accepted: [] };
  }
  return { accepted };
}
