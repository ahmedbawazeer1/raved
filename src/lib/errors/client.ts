/** Sends an error report to /api/errors without waiting (at most 5 per page load, never while offline). */
let sent = 0;

export function reportError(error: unknown, digest?: string) {
  if (typeof window === "undefined" || sent >= 5 || !navigator.onLine) return;
  sent++;
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  const body = JSON.stringify({ message: message.slice(0, 2000), digest, page: window.location.pathname });
  try {
    if (navigator.sendBeacon?.(new URL("/api/errors", window.location.origin), new Blob([body], { type: "application/json" }))) return;
    void fetch("/api/errors", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true }).catch(() => {});
  } catch {
    // ignore
  }
}
