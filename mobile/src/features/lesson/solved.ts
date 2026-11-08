import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

/** In-lesson activities solved on this phone (same role as the web's solvedStore). */
const KEY = "raved:solved";
let solved = new Set<string>();
const listeners = new Set<(s: Set<string>) => void>();
void AsyncStorage.getItem(KEY).then((raw) => {
  try {
    solved = new Set([...(JSON.parse(raw ?? "[]") as string[]), ...solved]);
    listeners.forEach((l) => l(solved));
  } catch {
    // keep memory
  }
});

export function markSolved(id: string) {
  if (solved.has(id)) return;
  solved = new Set(solved).add(id);
  void AsyncStorage.setItem(KEY, JSON.stringify([...solved].slice(-2000)));
  listeners.forEach((l) => l(solved));
}

export function useSolved(): Set<string> {
  const [s, setS] = useState(solved);
  useEffect(() => {
    listeners.add(setS);
    return () => void listeners.delete(setS);
  }, []);
  return s;
}
