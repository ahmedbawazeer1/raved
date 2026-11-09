import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { DEFAULT_AVATAR, parseAvatar, type AvatarConfig } from "@shared/art/avatar";

/** Device preferences (same meaning as the web's src/lib/fx.ts prefs). */
export interface Prefs {
  avatar: AvatarConfig;
  effects: boolean;
}
const KEY = "raved:prefs";
const DEFAULTS: Prefs = { avatar: DEFAULT_AVATAR, effects: true };
const listeners = new Set<(p: Prefs) => void>();
let current = DEFAULTS;
void AsyncStorage.getItem(KEY).then((raw) => {
  if (!raw) return;
  try {
    const p = JSON.parse(raw) as Partial<Prefs>;
    current = { effects: typeof p.effects === "boolean" ? p.effects : true, avatar: p.avatar ? parseAvatar(p.avatar) : DEFAULT_AVATAR };
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
