import type { Metadata } from "next";
import { ConsoleShell } from "@/components/console/shell";
import { requireAdmin } from "@/lib/auth/session";
import { loadConsoleSummary } from "@/lib/console/summary";

export const metadata: Metadata = { title: { default: "الإدارة", template: "%s · إدارة رفد" }, robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireAdmin();
  const summary = await loadConsoleSummary(true);
  return (
    <ConsoleShell name={profile.full_name || "المدير"} summary={summary}>
      {children}
    </ConsoleShell>
  );
}
