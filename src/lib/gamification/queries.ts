import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { fetchXpRows } from "@shared/data/student";

/** The student's point rows (shared query, cached per request). */
export const getXpRows = cache(async (userId: string) => fetchXpRows(await createClient(), userId));
