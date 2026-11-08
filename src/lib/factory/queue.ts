import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { queueNextUnitWith } from "./next-unit";

type Db = Awaited<ReturnType<typeof createClient>>;

/** Queues the next unit of a level (in order; one ahead while one waits for review). See `next-unit.ts`. */
export async function queueNextUnit(supabase: Db, levelId: string): Promise<string | null> {
  return queueNextUnitWith(supabase, levelId);
}
