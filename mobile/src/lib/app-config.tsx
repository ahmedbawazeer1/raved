import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import Constants from "expo-constants";
import { DEFAULT_APP_CONFIG, featureOn, parseAppConfig, updateState, type AppConfig, type UpdateState } from "@shared/app-config";
import { supabase } from "./supabase";

interface ConfigState {
  config: AppConfig;
  update: UpdateState;
  on: (feature: string) => boolean;
}

export const APP_VERSION = Constants.expoConfig?.version ?? "1.0.0";

const ConfigContext = createContext<ConfigState>({ config: DEFAULT_APP_CONFIG, update: "none", on: () => true });

/** Loads the admin's remote config (features, notice, minimum version). Offline or broken → defaults. */
export function AppConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState(DEFAULT_APP_CONFIG);
  useEffect(() => {
    supabase
      .from("app_config")
      .select("value")
      .eq("id", "mobile")
      .maybeSingle()
      .then(({ data }) => setConfig(parseAppConfig(data?.value)));
  }, []);
  return (
    <ConfigContext.Provider value={{ config, update: updateState(APP_VERSION, config), on: (f) => featureOn(config, f) }}>{children}</ConfigContext.Provider>
  );
}

export const useAppConfig = () => useContext(ConfigContext);
