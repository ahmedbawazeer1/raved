/** Decides where a signed-in person belongs, from their profile and application. */
export interface RoutingProfile {
  role: string;
  status: string;
  birth_date: string | null;
  phone: string | null;
  school: string | null;
}

export interface RoutingApplication {
  status: string;
}

export function isStep1Complete(profile: RoutingProfile): boolean {
  return Boolean(profile.birth_date && profile.phone && profile.school);
}

export function homePathFor(profile: RoutingProfile | null, application: RoutingApplication | null): string {
  if (!profile) return "/apply";
  if (profile.role === "admin") return "/admin";
  if (profile.status === "suspended") return "/apply/status";
  if (profile.status === "active") return "/student";
  if (!application || application.status === "draft") {
    return isStep1Complete(profile) ? "/apply/goal" : "/apply";
  }
  if (application.status === "approved") return "/student";
  return "/apply/status";
}

/** Only allow same-site relative redirects (prevents open redirects via ?next=). */
export function safeNextPath(next: string | null | undefined, fallback = "/"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}

/** Use ?next= only when it stays inside the person's own area (e.g. /admin/... for admins). */
export function pickDestination(home: string, next: string | null | undefined): string {
  const area = home.split("/").slice(0, 2).join("/");
  const candidate = safeNextPath(next, home);
  return candidate === area || candidate.startsWith(`${area}/`) ? candidate : home;
}
