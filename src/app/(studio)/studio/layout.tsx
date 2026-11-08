import type { Metadata } from "next";
import { ConsoleShell } from "@/components/console/shell";
import { requireStaff } from "@/lib/auth/session";
import { loadConsoleSummary } from "@/lib/console/summary";

/** Per-user, never prerendered. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: { default: "استوديو المحتوى", template: "%s · استوديو رفد" }, robots: { index: false } };

/** «استوديو المحتوى»: where the factory's maps, templates and units are reviewed (admin + teachers), in the same frame as the dashboard. */
export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const { profile, isAdmin } = await requireStaff();
  const summary = await loadConsoleSummary(isAdmin);
  return (
    <ConsoleShell name={profile.full_name || (isAdmin ? "المدير" : "المعلم")} summary={summary}>
      {children}
    </ConsoleShell>
  );
}
