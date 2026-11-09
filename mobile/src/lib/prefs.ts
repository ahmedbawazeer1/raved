import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { DEFAULT_AVATAR, parseAvatar, type AvatarConfig } from "@shared/art/avatar";
import type { Json } from "@shared/db-types";
import { supabase } from "./supabase";

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

let avatarTimer: ReturnType<typeof setTimeout> | undefined;

export function setPrefs(patch: Partial<Prefs>) {
  current = { ...current, ...patch };
  void AsyncStorage.setItem(KEY, JSON.stringify(current));
  listeners.forEach((l) => l(current));
  if (patch.avatar) {
    // Others see the avatar (league, arena, circles): save it on the account a moment after a change.
    clearTimeout(avatarTimer);
    const avatar = current.avatar;
    avatarTimer = setTimeout(() => void supabase.rpc("set_avatar", { p_avatar: avatar as unknown as Json }), 700);
  }
}

export function usePrefs(): Prefs {
  const [p, setP] = useState(current);
  useEffect(() => {
    listeners.add(setP);
    return () => void listeners.delete(setP);
  }, []);
  return p;
}
