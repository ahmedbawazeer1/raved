import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import type { CompanionId } from "@shared/art/companion";

/** Device preferences (same meaning as the web's src/lib/fx.ts prefs). */
export interface Prefs {
  companion: CompanionId;
  effects: boolean;
}
const KEY = "raved:prefs";
const DEFAULTS: Prefs = { companion: "hamza", effects: true };
const listeners = new Set<(p: Prefs) => void>();
let current = DEFAULTS;
void AsyncStorage.getItem(KEY).then((raw) => {
  if (!raw) return;
  try {
    current = { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Prefs>) };
    listeners.forEach((l) => l(current));
  } catch {
    // keep defaults
  }
});

export const getPrefs = (): Prefs => current;

export function setPrefs(patch: Partial<Prefs>) {
  current = { ...current, ...patch };
  void AsyncStorage.setItem(KEY, JSON.stringify(current));
  listeners.forEach((l) => l(current));
}

export function usePrefs(): Prefs {
  const [p, setP] = useState(current);
  useEffect(() => {
    listeners.add(setP);
    return () => void listeners.delete(setP);
  }, []);
  return p;
}
