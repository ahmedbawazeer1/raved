"use server";

import { z } from "zod";
import { requireActiveStudent } from "@/lib/auth/session";
import { GRADES } from "@/lib/srs";
import { saveReviews } from "@shared/data/vocab";
import { createClient } from "@/lib/supabase/server";

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

  return saveReviews(await createClient(), userId, reviews);
}
