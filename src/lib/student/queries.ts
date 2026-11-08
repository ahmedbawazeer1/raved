import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { fetchCurriculum, fetchPrimaryPath } from "@shared/data/student";

export type { Curriculum, LevelInfo, StudentPath } from "@shared/data/student";

/** The student's primary path (shared query, cached per request). */
export const getPrimaryPath = cache(async (userId: string) => fetchPrimaryPath(await createClient(), userId));

/** Published units of a path with the student's progress (shared query, cached per request). */
export const getCurriculum = cache(async (userId: string, pathId: string) => fetchCurriculum(await createClient(), userId, pathId));
