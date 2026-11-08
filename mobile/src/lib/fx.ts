import * as Haptics from "expo-haptics";
import { getPrefs, setPrefs, usePrefs } from "./prefs";

/** Small feedback effects (vibration). The student can turn them off in حسابي. */
export function useFxPrefs() {
  const p = usePrefs();
  return { effects: p.effects, setEffects: (on: boolean) => setPrefs({ effects: on }) };
}

export function fx(kind: "pop" | "good" | "bad" | "coin") {
  if (!getPrefs().effects) return;
  if (kind === "good" || kind === "coin") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  else if (kind === "bad") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  else void Haptics.selectionAsync();
}
