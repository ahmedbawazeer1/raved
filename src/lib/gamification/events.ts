/** Browser events between lesson blocks and the lesson's completion checklist. */
export const EXERCISE_SOLVED = "raved:exercise-solved";
export const VIDEO_DONE = "raved:video-done";

const SOLVED_KEY = "raved:solved";
/** Fallback when the browser blocks storage (private mode): solved ids for this visit. */
const memory = new Set<string>();

/** Exercises solved on this device (in-lesson exercises are checked locally). */
export function readSolved(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SOLVED_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

export function markSolved(id: string): void {
  memory.add(id);
  try {
    const set = readSolved();
    set.add(id);
    localStorage.setItem(SOLVED_KEY, JSON.stringify([...set].slice(-2000)));
  } catch {
    // storage unavailable: the checklist still updates for this visit
  }
  window.dispatchEvent(new CustomEvent(EXERCISE_SOLVED, { detail: { id } }));
}

function subscribeSolved(callback: () => void): () => void {
  window.addEventListener(EXERCISE_SOLVED, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EXERCISE_SOLVED, callback);
    window.removeEventListener("storage", callback);
  };
}

function solvedSnapshot(): string {
  let stored = "[]";
  try {
    stored = localStorage.getItem(SOLVED_KEY) ?? "[]";
  } catch {
    // storage unavailable
  }
  if (memory.size === 0) return stored;
  const all = new Set([...solvedStore.parse(stored), ...memory]);
  return JSON.stringify([...all].sort());
}

/** Live list of solved exercise ids (for useSyncExternalStore). */
export const solvedStore = {
  subscribe: subscribeSolved,
  getSnapshot: solvedSnapshot,
  getServerSnapshot: () => "[]",
  parse: (snapshot: string): Set<string> => {
    try {
      return new Set(JSON.parse(snapshot) as string[]);
    } catch {
      return new Set();
    }
  },
};
