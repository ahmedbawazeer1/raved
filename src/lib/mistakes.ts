/**
 * Exercises the student got wrong, kept on the device for «تدرّب على أخطائك». In-lesson exercises
 * already reach the device with their answers (they are checked offline), so storing them is safe.
 * An exercise leaves the list when it is answered right in the review.
 */
import type { PackageQuestion } from "@/lib/content/types";

const KEY = "raved:mistakes";
const MAX = 60;
let memory = "[]";
const listeners = new Set<() => void>();

function read(): string {
  try {
    return localStorage.getItem(KEY) ?? "[]";
  } catch {
    return memory;
  }
}

function write(list: PackageQuestion[]): void {
  memory = JSON.stringify(list);
  try {
    localStorage.setItem(KEY, memory);
  } catch {
    // storage unavailable: kept for this visit
  }
  listeners.forEach((l) => l());
}

export function parseMistakes(raw: string): PackageQuestion[] {
  try {
    const v: unknown = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((q): q is PackageQuestion => Boolean(q) && typeof q === "object" && typeof (q as PackageQuestion).id === "string") : [];
  } catch {
    return [];
  }
}

export function addMistake(q: PackageQuestion): void {
  const list = parseMistakes(read()).filter((m) => m.id !== q.id);
  write([q, ...list].slice(0, MAX));
}

export function removeMistake(id: string): void {
  const list = parseMistakes(read());
  if (list.some((m) => m.id === id)) write(list.filter((m) => m.id !== id));
}

export const mistakesStore = {
  subscribe(l: () => void) {
    listeners.add(l);
    const onStorage = (e: StorageEvent) => e.key === KEY && l();
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(l);
      window.removeEventListener("storage", onStorage);
    };
  },
  getSnapshot: read,
  getServerSnapshot: () => "[]",
};
