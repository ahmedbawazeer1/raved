/**
 * The student's data for the app screens. Queries come from shared/data (the same ones the website
 * uses); this file only wires them to React Query and the signed-in user.
 */
import { useQuery } from "@tanstack/react-query";
import { fetchActivityDates, fetchCurriculum, fetchPrimaryPath, fetchVocabDeck, fetchXpRows } from "@shared/data/student";
import { parseFeatures } from "@shared/paths/features";
import { dailyQuests } from "@shared/gamification/quests";
import { nextStep } from "@shared/student/progress";
import { watering } from "@shared/student/watering";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";

export function useUserId(): string | null {
  return useSession().session?.user.id ?? null;
}

/** Everything the «اليوم» screen shows. */
export function useHome() {
  const userId = useUserId();
  return useQuery({
    queryKey: ["home", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const uid = userId!;
      const path = await fetchPrimaryPath(supabase, uid);
      const features = parseFeatures(path?.features);
      const [curriculum, xpRows, activity, deck, unread, placement, me] = await Promise.all([
        path ? fetchCurriculum(supabase, uid, path.id) : Promise.resolve(null),
        fetchXpRows(supabase, uid),
        fetchActivityDates(supabase, uid),
        path && features.vocab ? fetchVocabDeck(supabase, uid, path.id) : Promise.resolve(null),
        supabase.from("notifications").select("id", { count: "exact", head: true }).eq("student_id", uid).is("read_at", null),
        path && features.placement
          ? supabase
              .from("placement_attempts")
              .select("status")
              .eq("student_id", uid)
              .eq("path_id", path.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        supabase.from("profiles").select("league_tier").eq("id", uid).maybeSingle(),
      ]);
      const step = curriculum ? nextStep(curriculum.units, curriculum) : ({ kind: "empty" } as const);
      return {
        path,
        features,
        curriculum,
        step,
        xp: xpRows.reduce((n, r) => n + r.points, 0),
        watering: watering(activity),
        quests: path ? dailyQuests(xpRows, features) : [],
        vocabToday: deck?.cards.length ?? 0,
        unread: unread.count ?? 0,
        placementPending: Boolean(path && features.placement && placement.data?.status !== "completed"),
        placementStarted: Boolean(placement.data),
        tier: me.data?.league_tier ?? 0,
      };
    },
  });
}

/** All levels and units of the student's path (the «التعلّم» tab and unit screens). */
export function useCurriculum() {
  const userId = useUserId();
  return useQuery({
    queryKey: ["curriculum", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const path = await fetchPrimaryPath(supabase, userId!);
      return { path, curriculum: path ? await fetchCurriculum(supabase, userId!, path.id) : null };
    },
  });
}
