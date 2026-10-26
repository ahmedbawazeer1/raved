"use server";

import { z } from "zod";
import { requireActiveStudent } from "@/lib/auth/session";
import { schedule, GRADES } from "@/lib/srs";
import { createClient } from "@/lib/supabase/server";
import type { TablesInsert } from "@/types/db";

const reviewSchema = z.object({
  id: z.uuid(),
  vocabItemId: z.uuid(),
  grade: z.enum(GRADES),
  reviewedAt: z.iso.datetime(),
});
export type VocabReviewInput = z.infer<typeof reviewSchema>;

/**
 * Saves reviews (also the ones queued offline) and schedules each word on the server.
 * Returns the queue ids that are safely stored, including repeats it already had.
 */
export async function saveVocabReviews(input: VocabReviewInput[]): Promise<{ accepted: string[] }> {
  const { userId } = await requireActiveStudent();
  const reviews = z.array(reviewSchema).max(200).parse(input);
  if (!reviews.length) return { accepted: [] };

  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("vocab_reviews")
    .select("vocab_item_id, ease, interval_days, repetitions, lapses, last_reviewed_at, review_count")
    .eq("student_id", userId)
    .in("vocab_item_id", [...new Set(reviews.map((r) => r.vocabItemId))]);
  if (error) return { accepted: [] };

  const state = new Map<string, Pick<TablesInsert<"vocab_reviews">, "ease" | "interval_days" | "repetitions" | "lapses" | "last_reviewed_at" | "review_count">>(
    rows.map((r) => [r.vocab_item_id, r]),
  );
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
      prev
        ? { ease: Number(prev.ease), intervalDays: prev.interval_days ?? 0, repetitions: prev.repetitions ?? 0, lapses: prev.lapses ?? 0 }
        : null,
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
    const { error: saveError } = await supabase
      .from("vocab_reviews")
      .upsert([...upserts.values()], { onConflict: "student_id,vocab_item_id" });
    if (saveError) return { accepted: [] };
  }
  return { accepted };
}
