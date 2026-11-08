import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export interface Profile {
  id: string;
  full_name: string;
  role: string;
  status: string;
}

interface SessionState {
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
  refreshProfile: () => Promise<void>;
}

const SessionContext = createContext<SessionState>({ loading: true, session: null, profile: null, refreshProfile: async () => {} });

/** Keeps the signed-in user and their profile (role, status) for every screen. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  async function loadProfile(s: Session | null) {
    if (!s) return setProfile(null);
    const { data } = await supabase.from("profiles").select("id, full_name, role, status").eq("id", s.user.id).maybeSingle();
    setProfile((data as Profile | null) ?? null);
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await loadProfile(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      void loadProfile(s);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return <SessionContext.Provider value={{ loading, session, profile, refreshProfile: () => loadProfile(session) }}>{children}</SessionContext.Provider>;
}

export const useSession = () => useContext(SessionContext);
